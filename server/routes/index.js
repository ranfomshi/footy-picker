const express = require('express');
const { Player, Game, GameResult, Availability, Rating } = require('../models');
const router = express.Router();

// Create a new player
router.post('/players', async (req, res) => {
    const { name } = req.body;
    const player = await Player.create({ name });
    res.json(player);
});

// Record game result
router.post('/games', async (req, res) => {
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
});

// Record availability
router.post('/availability', async (req, res) => {
    const { date, playerIds } = req.body;
    const availability = await Promise.all(playerIds.map(playerId => {
        return Availability.create({ date, playerId });
    }));
    res.json(availability);
});

// Get players
router.get('/players', async (req, res) => {
    const players = await Player.findAll();
    res.json(players);
});

// Get available players
router.get('/availability', async (req, res) => {
    const { date } = req.query;
    const availablePlayers = await Availability.findAll({
        where: { date },
        include: [Player]
    });
    res.json(availablePlayers);
});

// Pick teams based on availability and past performance
router.get('/pick-teams', async (req, res) => {
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
});

module.exports = router;
