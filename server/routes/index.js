const express = require('express');
const { Player, Gameweek, GameResult, Availability, TeamAssignment, Rating, RoomMembership, Room, sequelize } = require('../models');
const router = express.Router();
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const jwksRsa = require('jwks-rsa');
const axios = require('axios');

// Load environment variables
require('dotenv').config();

// Environment variables
const auth0Domain = process.env.AUTH0_DOMAIN;
const auth0Audience = process.env.AUTH0_AUDIENCE;

// JWKS client
const client = jwksRsa({
  jwksUri: `https://${auth0Domain}/.well-known/jwks.json`
});

// Middleware to protect routes and set roomId
const protect = async (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
  
    try {
      const decoded = jwt.decode(token, { complete: true });
      const kid = decoded.header.kid;
      const key = await client.getSigningKey(kid);
      const signingKey = key.getPublicKey();
  
      jwt.verify(token, signingKey, {
        audience: auth0Audience,
        issuer: `https://${auth0Domain}/`,
        algorithms: ['RS256']
      }, async (err, decodedToken) => {
        if (err) {
          return res.status(401).json({ error: 'Token verification failed' });
        }
        req.user = decodedToken;
  
        // Check if the user's auth0Id is linked to any player in any room
        const player = await Player.findOne({ where: { auth0Id: req.user.sub } });
        if (player) {
          // If the user is linked to a player, set the player's roomId
          const membership = await RoomMembership.findOne({ where: { auth0Id: req.user.sub } });
          if (membership) {
            req.user.roomId = membership.roomId;
          }
        }
  
        next();
      });
    } catch (error) {
      return res.status(401).json({ error: 'Token verification failed' });
    }
  };
  

// Helper function to generate a 5-character alphanumeric room code
const generateRoomCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let roomCode = '';
    for (let i = 0; i < 5; i++) {
      roomCode += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return roomCode;
  };

  // Endpoint to check if the user has a player linked to their auth0Id in any room
router.get('/check-player-existence', protect, async (req, res) => {
    const auth0Id = req.user.sub;
  
    try {
      const player = await Player.findOne({ where: { auth0Id } });
  
      if (player) {
        res.status(200).json({ exists: true, player });
      } else {
        res.status(200).json({ exists: false });
      }
    } catch (error) {
      console.error('Error checking player existence:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  

// Endpoint for creating a room
router.post('/create-room', protect, async (req, res) => {
  const { name } = req.body;
  const auth0Id = req.user.sub;
  const code = generateRoomCode();

  try {
    // Retrieve user profile information from Auth0
    const accessToken = req.headers.authorization.split(' ')[1];
    const userInfoResponse = await axios.get(`https://${auth0Domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const username = userInfoResponse.data.name;

    // Check if a player already exists for this auth0Id
    let player = await Player.findOne({ where: { auth0Id } });

    // If not, create a new player using the Auth0 username
    if (!player) {
      player = await Player.create({ auth0Id, name: username });
    }

    // Create the room
    const room = await Room.create({ name, code });

    // Create the room membership
    await RoomMembership.create({ playerId: player.id, auth0Id, roomId: room.id });

    res.status(201).json(room);
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/join-room', protect, async (req, res) => {
    const { code } = req.body;
    const auth0Id = req.user.sub;

    try {
        const room = await Room.findOne({ where: { code } });
        if (!room) {
            return res.status(404).json({ message: 'Room not found' });
        }

        // Check if a player exists for the auth0Id
        let player = await Player.findOne({ where: { auth0Id } });

        if (player) {
            // Check if the player is already a member of the room
            const existingMembership = await RoomMembership.findOne({ where: { auth0Id, roomId: room.id } });
            if (existingMembership) {
                return res.status(400).json({ message: 'Already a member of this room' });
            }

            // Create the room membership
            await RoomMembership.create({ playerId: player.id, auth0Id, roomId: room.id });
            return res.status(200).json({ message: 'Joined room successfully' });
        } else {
            // Fetch unlinked players in the room
            const unlinkedPlayers = await Player.findAll({
                include: {
                    model: RoomMembership,
                    where: { roomId: room.id, auth0Id: null }
                }
            });

            res.status(200).json({ unlinkedPlayers });
        }
    } catch (error) {
        console.error('Error joining room:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


router.post('/finalize-join-room', protect, async (req, res) => {
    const { roomCode, playerId, newPlayerName } = req.body;
    const auth0Id = req.user.sub;

    try {
        const room = await Room.findOne({ where: { code: roomCode } });
        if (!room) {
            return res.status(404).json({ error: 'Room not found' });
        }

        if (playerId) {
            // Link the existing unlinked player to the user
            const player = await Player.findOne({ where: { id: playerId, auth0Id: null } });
            if (!player) {
                return res.status(400).json({ error: 'Invalid player selection' });
            }
            player.auth0Id = auth0Id;
            await player.save();

            // Update RoomMembership with auth0Id
            await RoomMembership.update({ auth0Id }, { where: { playerId, roomId: room.id } });
        } else if (newPlayerName) {
            // Create a new player for the user
            const newPlayer = await Player.create({ auth0Id, name: newPlayerName });
            await RoomMembership.create({ playerId: newPlayer.id, auth0Id, roomId: room.id });
        } else {
            return res.status(400).json({ error: 'Invalid player selection' });
        }

        res.status(200).json({ message: 'Joined room successfully' });
    } catch (error) {
        console.error('Error finalizing room join:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


  

router.get('/pick-teams', protect, async (req, res) => {
    const { gameweekId } = req.query;
    const { roomId } = req.user;

    try {
        console.log(`Fetching players for gameweek ${gameweekId} in room ${roomId}`);

        const players = await Player.findAll({
            include: [
                {
                    model: Availability,
                    where: { gameweekId, status: true }
                },
                {
                    model: RoomMembership,
                    where: { roomId }
                }
            ],
            order: [['rating', 'DESC'], ['name', 'ASC']]
        });

        console.log(`Found ${players.length} players available for gameweek ${gameweekId}`);

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

        console.log(`Teams assigned successfully for gameweek ${gameweekId}`);
        res.json({ message: 'Teams assigned successfully' });
    } catch (error) {
        console.error('Error picking teams:', error);
        res.status(500).json({ error: 'Error picking teams' });
    }
});


// Endpoint to check if the user has joined any room
router.get('/check-room-membership', protect, async (req, res) => {
    const auth0Id = req.user.sub;
  
    try {
      const membership = await RoomMembership.findOne({
        where: { auth0Id },
        include: Room
      });
  
      if (membership) {
        res.status(200).json({ hasJoinedRoom: true, roomCode: membership.Room.code });
      } else {
        res.status(200).json({ hasJoinedRoom: false });
      }
    } catch (error) {
      console.error('Error checking room membership:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

  router.get('/players', protect, async (req, res) => {
    try {
      // The roomId is set in the protect middleware
      const { roomId } = req.user;
  
      if (!roomId) {
        return res.status(400).json({ error: 'User is not associated with any room' });
      }
  
      const players = await Player.findAll({
        include: [
          {
            model: RoomMembership,
            where: { roomId }
          },
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
        const teamAssignments = player.TeamAssignments;
  
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
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  
  

router.put('/players/:id/link', protect, async (req, res) => {
    const { id } = req.params;
    const { auth0Id } = req.body;
  
    if (!auth0Id) {
      return res.status(400).json({ error: 'auth0Id is required' });
    }
  
    try {
      // Check for existing player with this auth0Id
      const existingPlayer = await Player.findOne({ where: { auth0Id } });
      if (existingPlayer) {
        return res.status(400).json({ error: 'A player with this auth0Id already exists' });
      }
  
      // Link player
      const player = await Player.findByPk(id);
      if (!player) {
        return res.status(404).json({ error: 'Player not found' });
      }
  
      player.auth0Id = auth0Id;
      await player.save();
  
      res.status(200).json(player);
    } catch (error) {
      console.error('Error linking player:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });

// Endpoint to add a new player and link to room
router.post('/players', protect, async (req, res) => {
    const { name } = req.body;
    const auth0Id = req.user.sub;
  
    if (!name) {
      return res.status(400).json({ error: 'Player name is required' });
    }
  
    try {
      // Check for duplicate player by name
      const duplicateName = await Player.findOne({ where: { name } });
      if (duplicateName) {
        return res.status(400).json({ error: 'Player name already exists' });
      }
  
      // Fetch the logged-in user's room membership
      const currentUserMembership = await RoomMembership.findOne({ where: { auth0Id } });
  
      if (!currentUserMembership) {
        return res.status(400).json({ error: 'User is not a member of any room' });
      }
  
      // Create the new player
      const newPlayer = await Player.create({ name });
  
      // Link the new player to the same room as the logged-in user
      await RoomMembership.create({
        playerId: newPlayer.id,
        auth0Id: null, // Unlinked player
        roomId: currentUserMembership.roomId
      });
  
      res.status(201).json(newPlayer);
    } catch (error) {
      console.error('Error adding player:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });
  

router.delete('/players/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { roomId } = req.user;

    const player = await Player.findOne({
      include: {
        model: RoomMembership,
        where: { roomId }
      },
      where: { id }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    await player.destroy();
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting player", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/players/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { roomId } = req.user;

    const player = await Player.findOne({
      include: {
        model: RoomMembership,
        where: { roomId }
      },
      where: { id }
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    player.name = name;
    await player.save();
    res.json(player);
  } catch (error) {
    console.error("Error updating player", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/gameresults', protect, async (req, res) => {
  try {
    const { gameweekId, teamA_score, teamB_score } = req.body;
    const { roomId } = req.user;

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

    await updatePlayerRatings(gameweekId, roomId);
    res.json(gameResult);
  } catch (error) {
    console.error('Error recording game result:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

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

            // Retrieve the last 5 ratings for the player
            const ratings = await Rating.findAll({
                where: { playerId: assignment.playerId },
                limit: 5,
                order: [['date', 'DESC']]
            });

            console.log(`Ratings for player ${assignment.playerId}:`, ratings);

            if (ratings.length === 0) {
                console.error(`No ratings found for player ${assignment.playerId}`);
                continue;
            }

            // Sum the total points from the last 5 ratings
            const totalPoints = ratings.reduce((acc, rating) => acc + parseFloat(rating.rating || 0), 0);
            const player = await Player.findByPk(assignment.playerId);

            if (!player) {
                console.error(`Player not found: ${assignment.playerId}`);
                continue;
            }

            // Update the player's rating with the total points
            player.rating = totalPoints;

            console.log(`Total points: ${totalPoints.toFixed(2)}, Updated rating: ${player.rating.toFixed(2)}`);

            await player.save();
        }
    } catch (error) {
        console.error('Error updating player ratings:', error);
    }
};

router.get('/gameresults', protect, async (req, res) => {
  try {
    const { roomId } = req.user;
    const gameResults = await GameResult.findAll({
      include: [
        {
          model: Gameweek,
          where: { roomId }
        }
      ]
    });
    res.json(gameResults);
  } catch (error) {
    console.error("Error fetching game results", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/availability', protect, async (req, res) => {
  try {
    const { gameweekId, playerIds, status } = req.body;
    const { roomId } = req.user;

    if (!gameweekId || !playerIds || playerIds.length === 0) {
      res.status(400).json({ error: 'gameweekId and playerIds are required' });
      return;
    }

    const availability = await Promise.all(playerIds.map(async playerId => {
      const player = await Player.findOne({
        include: {
          model: RoomMembership,
          where: { roomId }
        },
        where: { id: playerId }
      });
      if (!player) {
        throw new Error(`Player not found: ${playerId}`);
      }
      return Availability.upsert({ gameweekId, playerId, status });
    }));

    res.json(availability);
  } catch (error) {
    console.error("Error recording availability", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/teamassignments', protect, async (req, res) => {
  try {
    const { gameweekId, playerIds, team } = req.body;
    const { roomId } = req.user;

    if (!gameweekId || !playerIds || playerIds.length === 0 || !team) {
      res.status(400).json({ error: 'gameweekId, playerIds and team are required' });
      return;
    }

    const teamAssignments = await Promise.all(playerIds.map(async playerId => {
      const player = await Player.findOne({
        include: {
          model: RoomMembership,
          where: { roomId }
        },
        where: { id: playerId }
      });
      if (!player) {
        throw new Error(`Player not found: ${playerId}`);
      }
      return TeamAssignment.upsert({ gameweekId, playerId, team });
    }));

    res.json(teamAssignments);
  } catch (error) {
    console.error("Error recording team assignment", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/availability', protect, async (req, res) => {
  try {
    const { gameweekId } = req.query;
    const { roomId } = req.user;

    const availability = await Availability.findAll({
      where: { gameweekId },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId }
          }
        },
        Gameweek
      ]
    });
    res.json(availability);
  } catch (error) {
    console.error("Error fetching availability", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/ratings', protect, async (req, res) => {
  try {
    const { date, ratings } = req.body;
    const { roomId } = req.user;

    const ratingRecords = await Promise.all(ratings.map(async rating => {
      const player = await Player.findOne({
        include: {
          model: RoomMembership,
          where: { roomId }
        },
        where: { id: rating.playerId }
      });
      if (!player) {
        throw new Error(`Player not found: ${rating.playerId}`);
      }
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

router.get('/ratings', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const { roomId } = req.user;

    const ratings = await Rating.findAll({
      where: { date },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId }
          }
        }
      ],
      attributes: ['playerId', [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
      group: ['playerId'],
    });
    res.json(ratings);
  } catch (error) {
    console.error("Error fetching ratings", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/gameweeks', protect, async (req, res) => {
  try {
    const { date } = req.body;
    const { roomId } = req.user;

    const gameweek = await Gameweek.create({ date, roomId });
    res.json(gameweek);
  } catch (error) {
    console.error("Error creating gameweek", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/gameweeks', protect, async (req, res) => {
  try {
    const { roomId } = req.user;

    const gameweeks = await Gameweek.findAll({ where: { roomId } });
    res.json(gameweeks);
  } catch (error) {
    console.error("Error fetching gameweeks", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.delete('/gameweeks/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { roomId } = req.user;

    const gameweek = await Gameweek.findOne({ where: { id, roomId } });
    if (!gameweek) {
      return res.status(404).json({ error: 'Gameweek not found' });
    }

    await gameweek.destroy();
    res.status(204).end();
  } catch (error) {
    console.error("Error deleting gameweek", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/teamassignments', protect, async (req, res) => {
  try {
    const { gameweekId } = req.query;
    const { roomId } = req.user;

    const assignments = await TeamAssignment.findAll({
      where: { gameweekId },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId }
          }
        }
      ]
    });
    res.json(assignments);
  } catch (error) {
    console.error("Error fetching team assignments", error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

module.exports = router;
