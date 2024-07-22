const express = require('express');
const { Player, Game, GameResult, Availability, Rating } = require('../models');
const router = express.Router();
const sequelize = require('sequelize');

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

// Record game result
router.post('/games', async (req, res) => {
    try {
        const { date, results } = req.body; // results: [{playerId, team, goals}]
        const game = await Game.create({ date });
        const gameResults = await Promise.all(results.map(result => {
            return GameResult.create({
                gameId: game.id,
                playerId: result.playerId,
                team: result.team,
                goals: result.goals
            });
        }));
        res.json({ game, gameResults });
    } catch (error) {
        console.error("Error recording game result", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Record availability
router.post('/availability', async (req, res) => {
    try {
        const { date, playerIds } = req.body;
        const availability = await Promise.all(playerIds.map(playerId => {
            return Availability.create({ date, playerId });
        }));
        res.json(availability);
    } catch (error) {
        console.error("Error recording availability", error);
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
        const { date } = req.query;
        const availablePlayers = await Availability.findAll({
            where: { date },
            include: [Player]
        });
        res.json(availablePlayers);
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
        const { date } = req.query;
        const availablePlayers = await Availability.findAll({
            where: { date },
            include: [Player]
        });
        const players = availablePlayers.map(a => a.Player);

        // Simple team picking logic: sort by rating and alternate
        players.sort((a, b) => b.rating - a.rating);
        const teamA = [];
        const teamB = [];
        players.forEach((player, index) => {
            if (index % 2 === 0) {
                teamA.push(player);
            } else {
                teamB.push(player);
            }
        });

        res.json({ teamA, teamB });
    } catch (error) {
        console.error("Error picking teams", error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

module.exports = router;
