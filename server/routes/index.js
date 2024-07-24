const express = require('express');
const { Player, Gameweek, GameResult, Availability, TeamAssignment, Rating } = require('../models');
const router = express.Router();
const { Op } = require('sequelize');

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

// Fetch all game results
router.get('/gameresults', async (req, res) => {
    try {
        const gameResults = await GameResult.findAll();
        res.json(gameResults);
    } catch (error) {
        console.error("Error fetching game results", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Record game result
router.post('/gameresults', async (req, res) => {
    try {
        const { gameweekId, teamA_score, teamB_score } = req.body;

        // Check if a game result already exists for the given gameweek
        const existingResult = await GameResult.findOne({ where: { gameweekId } });

        if (existingResult) {
            return res.status(400).json({ error: 'Game result for this gameweek already exists' });
        }

        // Calculate winner
        let winner = 'Draw';
        if (teamA_score > teamB_score) {
            winner = 'Team A';
        } else if (teamB_score > teamA_score) {
            winner = 'Team B';
        }

        const gameResult = await GameResult.create({ gameweekId, teamA_score, teamB_score, winner });
        res.json(gameResult);
    } catch (error) {
        console.error("Error recording game result", error);
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

// Get players
router.get('/players', async (req, res) => {
    try {
        const players = await Player.findAll();
        res.json(players);
    } catch (error) {
        console.error("Error fetching players", error);
        res.status(500).json({ error: 'Internal Server Error' });
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

// Pick teams based on availability and past performance
router.get('/pick-teams', async (req, res) => {
    try {
        const { gameweekId } = req.query;

        // Fetch available players
        const availablePlayers = await Availability.findAll({
            where: { gameweekId, status: true },
            include: [{ model: Player }]
        });
        const playerIds = availablePlayers.map(a => a.playerId);

        // Remove existing team assignments for players not available
        await TeamAssignment.destroy({
            where: {
                gameweekId,
                playerId: { [Op.notIn]: playerIds }
            }
        });

        // Simple team picking logic: sort by rating and alternate
        availablePlayers.sort((a, b) => b.Player.rating - a.Player.rating);
        const teamA = [];
        const teamB = [];
        availablePlayers.forEach((availability, index) => {
            const player = availability.Player;
            if (index % 2 === 0) {
                teamA.push(player);
            } else {
                teamB.push(player);
            }
        });

        // Assign players to teams
        await Promise.all([
            ...teamA.map(player => TeamAssignment.upsert({ gameweekId, playerId: player.id, team: 'A' })),
            ...teamB.map(player => TeamAssignment.upsert({ gameweekId, playerId: player.id, team: 'B' }))
        ]);

        res.json({ teamA, teamB });
    } catch (error) {
        console.error("Error picking teams", error);
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
