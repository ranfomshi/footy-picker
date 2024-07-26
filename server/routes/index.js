const express = require('express');
const { Player, Gameweek, GameResult, Availability, TeamAssignment, Rating, sequelize } = require('../models');
const router = express.Router();
const { Op } = require('sequelize');

const updatePlayerRatings = async (gameweekId) => {
    try {
        const gameResult = await GameResult.findOne({
            where: { gameweekId },
            include: [Gameweek]
        });

        if (!gameResult) {
            console.error(`No game result found for gameweek ${gameweekId}`);
            return;
        }

        const teamAssignments = await TeamAssignment.findAll({
            where: { gameweekId },
            include: [Player]
        });

        for (const assignment of teamAssignments) {
            let points = 0;
            if ((assignment.team === 'A' && gameResult.teamA_score > gameResult.teamB_score) ||
                (assignment.team === 'B' && gameResult.teamB_score > gameResult.teamA_score)) {
                points += 3;
            } else if (gameResult.teamA_score === gameResult.teamB_score) {
                points += 1;
            }

            if (assignment.team === 'A') {
                points += gameResult.teamA_score * 0.2 - gameResult.teamB_score * 0.1;
            } else {
                points += gameResult.teamB_score * 0.2 - gameResult.teamA_score * 0.1;
            }

            console.log(`Player ${assignment.playerId} earned ${points.toFixed(2)} points for gameweek ${gameweekId}`);

            // Ensure the rating is created correctly
            await Rating.create({
                playerId: assignment.playerId,
                date: gameResult.Gameweek.date,
                rating: points,
                raterId: null
            });

            const ratings = await Rating.findAll({
                where: { playerId: assignment.playerId },
                limit: 5,
                order: [['createdAt', 'DESC']]
            });

            console.log(`Ratings for player ${assignment.playerId}:`, ratings);

            if (ratings.length === 0) {
                console.error(`No ratings found for player ${assignment.playerId}`);
                continue;
            }

            const totalPoints = ratings.reduce((acc, rating) => acc + parseFloat(rating.rating || 0), 0);
            const player = await Player.findByPk(assignment.playerId);

            if (!player) {
                console.error(`Player not found: ${assignment.playerId}`);
                continue;
            }

            player.rating = totalPoints / ratings.length;

            console.log(`Total points: ${totalPoints.toFixed(2)}, Ratings length: ${ratings.length}, Calculated rating: ${player.rating.toFixed(2)}`);

            if (isNaN(player.rating)) {
                console.error(`Calculated NaN rating for player ${player.id} (${player.name}). Total points: ${totalPoints.toFixed(2)}, Ratings length: ${ratings.length}`);
                continue;
            }

            console.log(`Updating rating for player ${player.id} (${player.name}): ${player.rating.toFixed(2)}`);

            await player.save();
        }
    } catch (error) {
        console.error('Error updating player ratings:', error);
    }
};


// Pick teams based on availability and past performance
router.get('/pick-teams', async (req, res) => {
    const { gameweekId } = req.query;

    try {
        const players = await Player.findAll({
            include: [
                {
                    model: Availability,
                    where: { gameweekId, status: true }
                }
            ],
            order: [['rating', 'DESC'], ['name', 'ASC']]
        });

        const teamA = [];
        const teamB = [];

        players.forEach((player, index) => {
            if (index % 2 === 0) {
                teamA.push(player.id);
            } else {
                teamB.push(player.id);
            }
        });

        await TeamAssignment.destroy({ where: { gameweekId } });

        await TeamAssignment.bulkCreate([
            ...teamA.map(playerId => ({ playerId, gameweekId, team: 'A' })),
            ...teamB.map(playerId => ({ playerId, gameweekId, team: 'B' })),
        ]);

        res.json({ message: 'Teams assigned successfully' });
    } catch (error) {
        console.error('Error picking teams:', error);
        res.status(500).json({ error: 'Error picking teams' });
    }
});

// Create a new player
router.post('/players', async (req, res) => {
    try {
        const { name } = req.body;
        const player = await Player.create({ name });
        res.json(player);
    } catch (error) {
        console.error("Error creating player", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a player
router.delete('/players/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Player.destroy({ where: { id } });
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting player", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Update a player
router.put('/players/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        const player = await Player.findByPk(id);
        if (player) {
            player.name = name;
            await player.save();
            res.json(player);
        } else {
            res.status(404).json({ error: 'Player not found' });
        }
    } catch (error) {
        console.error("Error updating player", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.post('/gameresults', async (req, res) => {
    try {
        const { gameweekId, teamA_score, teamB_score } = req.body;

        // Upsert game result to avoid duplicates for the same gameweek
        const [gameResult, created] = await GameResult.upsert({
            gameweekId, teamA_score, teamB_score
        }, {
            returning: true
        });

        if (created) {
            console.log(`Game result recorded for gameweek ${gameweekId}: Team A ${teamA_score} - ${teamB_score} Team B`);
        } else {
            console.log(`Game result updated for gameweek ${gameweekId}: Team A ${teamA_score} - ${teamB_score} Team B`);
        }

        await updatePlayerRatings(gameweekId);
        res.json(gameResult);
    } catch (error) {
        console.error('Error recording game result:', error);
        res.status(500).json({ error: 'Error recording game result' });
    }
});

router.get('/gameresults', async (req, res) => {
    try {
        const gameResults = await GameResult.findAll();
        res.json(gameResults);
    } catch (error) {
        console.error("Error fetching game results", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Record availability
router.post('/availability', async (req, res) => {
    try {
        const { gameweekId, playerIds, status } = req.body;

        // Validate received data
        if (!gameweekId || !playerIds || playerIds.length === 0) {
            res.status(400).json({ error: 'gameweekId and playerIds are required' });
            return;
        }

        const availability = await Promise.all(playerIds.map(playerId => {
            return Availability.upsert({ gameweekId, playerId, status });
        }));

        res.json(availability);
    } catch (error) {
        console.error("Error recording availability", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Record team assignment
router.post('/teamassignments', async (req, res) => {
    try {
        const { gameweekId, playerIds, team } = req.body;

        // Validate received data
        if (!gameweekId || !playerIds || playerIds.length === 0 || !team) {
            res.status(400).json({ error: 'gameweekId, playerIds and team are required' });
            return;
        }

        const teamAssignments = await Promise.all(playerIds.map(playerId => {
            return TeamAssignment.upsert({ gameweekId, playerId, team });
        }));

        res.json(teamAssignments);
    } catch (error) {
        console.error("Error recording team assignment", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

router.get('/players', async (req, res) => {
    try {
        const players = await Player.findAll({
            include: [
                {
                    model: TeamAssignment,
                    include: [
                        {
                            model: Gameweek,
                            include: [
                                {
                                    model: GameResult
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        const playerStats = await Promise.all(players.map(async (player) => {
            const teamAssignments = await TeamAssignment.findAll({
                where: {
                    playerId: player.id
                },
                include: [
                    {
                        model: Gameweek,
                        include: [
                            {
                                model: GameResult
                            }
                        ]
                    }
                ]
            });

            let wins = 0;
            let draws = 0;
            let losses = 0;
            let goalsFor = 0;
            let goalsAgainst = 0;

            teamAssignments.forEach(assignment => {
                const gameResult = assignment.Gameweek.GameResult;
                if (gameResult) {
                    const team = assignment.team;
                    const teamScore = team === 'A' ? gameResult.teamA_score : gameResult.teamB_score;
                    const opponentScore = team === 'A' ? gameResult.teamB_score : gameResult.teamA_score;

                    goalsFor += teamScore;
                    goalsAgainst += opponentScore;

                    if (teamScore > opponentScore) {
                        wins += 1;
                    } else if (teamScore < opponentScore) {
                        losses += 1;
                    } else {
                        draws += 1;
                    }
                }
            });

            player.dataValues.wins = wins;
            player.dataValues.draws = draws;
            player.dataValues.losses = losses;
            player.dataValues.goalsFor = goalsFor;
            player.dataValues.goalsAgainst = goalsAgainst;

            return player;
        }));

        res.json(playerStats);
    } catch (error) {
        console.error('Error fetching players:', error);
        res.status(500).json({ error: 'Error fetching players' });
    }
});

// Get available players
router.get('/availability', async (req, res) => {
    try {
        const { gameweekId } = req.query;
        const availability = await Availability.findAll({
            where: { gameweekId },
            include: [Player, Gameweek]
        });
        res.json(availability);
    } catch (error) {
        console.error("Error fetching availability", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Record player ratings
router.post('/ratings', async (req, res) => {
    try {
        const { date, ratings } = req.body; // ratings: [{playerId, rating, raterId}]
        const ratingRecords = await Promise.all(ratings.map(rating => {
            return Rating.create({
                date,
                playerId: rating.playerId,
                rating: rating.rating,
                raterId: rating.raterId,
            });
        }));
        res.json(ratingRecords);
    } catch (error) {
        console.error("Error recording ratings", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get average ratings for players on a specific date
router.get('/ratings', async (req, res) => {
    try {
        const { date } = req.query;
        const ratings = await Rating.findAll({
            where: { date },
            attributes: ['playerId', [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
            group: ['playerId'],
        });
        res.json(ratings);
    } catch (error) {
        console.error("Error fetching ratings", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Create a new gameweek
router.post('/gameweeks', async (req, res) => {
    try {
        const { date } = req.body;
        const gameweek = await Gameweek.create({ date });
        res.json(gameweek);
    } catch (error) {
        console.error("Error creating gameweek", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get all gameweeks
router.get('/gameweeks', async (req, res) => {
    try {
        const gameweeks = await Gameweek.findAll();
        res.json(gameweeks);
    } catch (error) {
        console.error("Error fetching gameweeks", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Delete a gameweek
router.delete('/gameweeks/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Gameweek.destroy({ where: { id } });
        res.status(204).end();
    } catch (error) {
        console.error("Error deleting gameweek", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Get team assignments
router.get('/teamassignments', async (req, res) => {
    try {
        const { gameweekId } = req.query;
        const assignments = await TeamAssignment.findAll({ where: { gameweekId } });
        res.json(assignments);
    } catch (error) {
        console.error("Error fetching team assignments", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
