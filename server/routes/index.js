const express = require('express');
const {
  Player,
  Gameweek,
  GameResult,
  Availability,
  TeamAssignment,
  Rating,
  RoomMembership,
  Room,
  Vote,
  sequelize,
} = require('../models');
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

console.log('Auth0 Domain:', auth0Domain);

// JWKS client
const client = jwksRsa({
  jwksUri: `https://${auth0Domain}/.well-known/jwks.json`,
});

// Middleware to protect routes, verify token, and set playerId and roomId
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    // Decode the JWT token
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      console.error('Failed to decode token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const kid = decoded.header.kid;
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

    // Verify the JWT token
    jwt.verify(
      token,
      signingKey,
      {
        audience: auth0Audience,
        issuer: `https://${auth0Domain}/`,
        algorithms: ['RS256'],
      },
      async (err, decodedToken) => {
        if (err) {
          console.error('Token verification failed:', err);
          return res.status(401).json({ error: 'Token verification failed' });
        }

        // Attach the decoded token to the request object
        req.user = decodedToken;

        // Fetch the player using the auth0Id from the token
        const player = await Player.findOne({ where: { auth0Id: req.user.sub } });

        if (player) {
          // Store playerId for further use
          req.user.playerId = player.id;

          // Fetch the active room membership
          const membership = await RoomMembership.findOne({
            where: { playerId: player.id, isActive: true },
          });
          if (membership) {
            req.user.roomId = membership.roomId;
          }
        } else {
          // Player not found, proceed without playerId and roomId
          console.log('Player not found for auth0Id:', req.user.sub);
          // You can set req.user.playerId = null; or omit it
        }

        next();
      }
    );
  } catch (error) {
    console.error('Error during token verification:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

// Helper function to generate a 5-character alphanumeric room code
const generateRoomCode = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from({ length: 5 }, () => characters.charAt(Math.floor(Math.random() * characters.length))).join('');
};

// Routes
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

router.get('/current-player', protect, async (req, res) => {
  try {
    const playerId = req.user.playerId; // This is set in the `protect` middleware

    if (!playerId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fetch the player information using the internal `id`
    const player = await Player.findByPk(playerId, {
      attributes: ['id', 'name', 'rating'], // Fetch any additional details you need
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Return the player's information
    res.json(player);
  } catch (error) {
    console.error('Error fetching current player:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/create-room', protect, async (req, res) => {
  const { name } = req.body;
  const auth0Id = req.user.sub;
  const code = generateRoomCode();

  try {
    const accessToken = req.headers.authorization.split(' ')[1];
    const userInfoResponse = await axios.get(`https://${auth0Domain}/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const username = userInfoResponse.data.name;

    let player = await Player.findOne({ where: { auth0Id } });
    if (!player) {
      player = await Player.create({ auth0Id, name: username });
    }

    const room = await Room.create({ name, code });
    await RoomMembership.create({ playerId: player.id, roomId: room.id, isActive: true });

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

    let player = await Player.findOne({ where: { auth0Id } });

    if (player) {
      const existingMembership = await RoomMembership.findOne({
        where: { playerId: player.id, roomId: room.id },
      });
      if (existingMembership) {
        return res.status(400).json({ message: 'Already a member of this room' });
      }

      await RoomMembership.create({ playerId: player.id, roomId: room.id });
      return res.status(200).json({ message: 'Joined room successfully' });
    } else {
      const unlinkedPlayers = await Player.findAll({
        include: {
          model: RoomMembership,
          where: { roomId: room.id, auth0Id: null },
        },
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
      const player = await Player.findOne({ where: { id: playerId, auth0Id: null } });
      if (!player) {
        return res.status(400).json({ error: 'Invalid player selection' });
      }
      player.auth0Id = auth0Id;
      await player.save();
    } else if (newPlayerName !== null) {
      const newPlayer = await Player.create({ auth0Id, name: newPlayerName });
      await RoomMembership.create({ playerId: newPlayer.id, roomId: room.id });
    } else {
      const accessToken = req.headers.authorization.split(' ')[1];
      const userInfoResponse = await axios.get(`https://${auth0Domain}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const username = userInfoResponse.data.name;

      const newPlayer = await Player.create({ auth0Id, name: username });
      await RoomMembership.create({ playerId: newPlayer.id, roomId: room.id });
    }

    res.status(200).json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Error finalizing room join:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/unlink-player', protect, async (req, res) => {
  const auth0Id = req.user.sub;
  const { roomCode } = req.body; // Get the roomCode from the request body

  try {
    const player = await Player.findOne({ where: { auth0Id } });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // Fetch the roomId using the roomCode (which is a string)
    const room = await Room.findOne({ where: { code: roomCode } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const roomId = room.id;

    // Now, use the roomId (which is an integer) to find the RoomMembership
    const roomMembership = await RoomMembership.findOne({
      where: { playerId: player.id, roomId: roomId } // Use roomId here
    });

    if (roomMembership) {
      await roomMembership.update({ auth0Id: null, isActive: false });
      res.status(200).json({ message: 'Player unlinked successfully from the room' });
    } else {
      res.status(404).json({ error: 'Player not found in this room' });
    }
  } catch (error) {
    console.error('Error unlinking player:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/pick-teams', protect, async (req, res) => {
  const { gameweekId } = req.query;
  const { roomId } = req.user;

  try {
    const players = await Player.findAll({
      include: [
        {
          model: Availability,
          where: { gameweekId, status: true, roomId },
        },
        {
          model: RoomMembership,
          where: { roomId },
        },
      ],
      order: [
        ['rating', 'DESC'],
        ['name', 'ASC'],
      ],
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

    await TeamAssignment.destroy({ where: { gameweekId, roomId } });

    await TeamAssignment.bulkCreate([
      ...teamA.map((playerId) => ({ playerId, gameweekId, team: 'A', roomId })),
      ...teamB.map((playerId) => ({ playerId, gameweekId, team: 'B', roomId })),
    ]);

    res.json({ message: 'Teams assigned successfully' });
  } catch (error) {
    console.error('Error picking teams:', error);
    res.status(500).json({ error: 'Error picking teams' });
  }
});

router.get('/check-room-membership', protect, async (req, res) => {
  const playerId = req.user.playerId;

  try {
    // Fetch all room memberships for the user
    const memberships = await RoomMembership.findAll({
      where: {
        playerId,
        auth0Id: { [Op.ne]: null }  // Ensures that auth0Id is not null
      },
      include: Room,
    });

    // Ensure the response structure is always consistent
    const joinedRooms = memberships.map((membership) => ({
      id: membership.Room.id,
      name: membership.Room.name,
      code: membership.Room.code,
    }));

    // Get the active room
    const activeMembership = memberships.find((membership) => membership.isActive);
    const activeRoom = activeMembership
      ? {
          id: activeMembership.Room.id,
          name: activeMembership.Room.name,
          code: activeMembership.Room.code,
        }
      : null;

    res.status(200).json({
      activeRoom,
      joinedRooms,
    });
  } catch (error) {
    console.error('Error checking room membership:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/set-active-room', protect, async (req, res) => {
  const auth0Id = req.user.sub;
  const { roomId: roomCode } = req.body; // Accept roomCode instead of numeric roomId

  try {
    // Find the room by its code
    const room = await Room.findOne({ where: { code: roomCode } });

    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // Use the room's id to update RoomMembership
    const roomId = room.id;

    // Find the playerId associated with this auth0Id
    const player = await Player.findOne({ where: { auth0Id } });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const playerId = player.id;

    const membership = await RoomMembership.findOne({
      where: { playerId, roomId },
    });

    if (!membership) {
      return res.status(404).json({ error: 'User is not a member of the specified room' });
    }

    // Update isActive field in RoomMemberships
    await RoomMembership.update(
      { isActive: false },
      { where: { playerId } } // Deactivate other memberships
    );

    await RoomMembership.update(
      { isActive: true },
      { where: { playerId, roomId } } // Activate the current room
    );

    res.status(200).json({ success: true, activeRoom: room });
  } catch (error) {
    console.error('Error setting active room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/players', protect, async (req, res) => {
  try {
    const { roomId } = req.user;
    console.log('Fetching players for roomId:', roomId, 'User:', req.user);

    if (!roomId) {
      return res.status(400).json({ error: 'User is not associated with any room' });
    }

    // 1. Fetch all players in the room with LEFT JOINs to include optional associations
    const players = await Player.findAll({
      include: [
        {
          model: RoomMembership,
          where: { roomId },
          required: true, // Ensures the player is a member of the room
        },
        {
          model: TeamAssignment,
          where: { roomId },
          required: false, // Allows players without team assignments to be included
          include: [
            {
              model: Gameweek,
              where: { roomId },
              required: false, // Allows team assignments without gameweeks
              include: [
                {
                  model: GameResult,
                  where: { roomId },
                  required: false, // Allows gameweeks without results
                },
              ],
            },
          ],
        },
      ],
    });

    // 2. Fetch all gameweeks in the room
    const gameweeks = await Gameweek.findAll({
      where: { roomId },
    });

    // Extract gameweek IDs, handling cases where there are no gameweeks
    const gameweekIds = gameweeks.length > 0 ? gameweeks.map((gw) => gw.id) : [];

    // 3. Fetch all votes for gameweeks in the room, only if there are gameweeks
    const votes = gameweekIds.length > 0 ? await Vote.findAll({
      where: {
        gameweek_id: {
          [Op.in]: gameweekIds,
        },
        roomId,
      },
      attributes: [
        'gameweek_id',
        'voted_player_id',
        [sequelize.fn('COUNT', sequelize.col('voted_player_id')), 'vote_count'],
      ],
      group: ['gameweek_id', 'voted_player_id'],
      order: [
        ['gameweek_id', 'ASC'],
        [sequelize.literal('vote_count'), 'DESC'],
      ],
    }) : [];

    // 4. Build a mapping of gameweekId to player(s) of the match
    const playerOfTheMatchMap = {};

    // Group votes by gameweek
    const votesByGameweek = votes.reduce((acc, vote) => {
      const gameweekId = vote.gameweek_id;
      if (!acc[gameweekId]) {
        acc[gameweekId] = [];
      }
      acc[gameweekId].push(vote);
      return acc;
    }, {});

    // Determine player(s) of the match for each gameweek
    for (const gameweekId in votesByGameweek) {
      const gameweekVotes = votesByGameweek[gameweekId];
      if (gameweekVotes.length === 0) continue; // Skip if no votes

      const topVoteCount = gameweekVotes[0].dataValues.vote_count;

      // Find all players tied for the top vote count
      const topVotes = gameweekVotes.filter(
        (vote) => vote.dataValues.vote_count === topVoteCount
      );

      // Store the player IDs in the map
      playerOfTheMatchMap[gameweekId] = topVotes.map(
        (vote) => vote.voted_player_id
      );
    }

    // 5. Calculate total "Player of the Match" counts per player
    const playerOfTheMatchCounts = {};

    for (const gameweekId in playerOfTheMatchMap) {
      const playerIds = playerOfTheMatchMap[gameweekId];

      for (const playerId of playerIds) {
        if (!playerOfTheMatchCounts[playerId]) {
          playerOfTheMatchCounts[playerId] = 0;
        }
        playerOfTheMatchCounts[playerId] += 1;
      }
    }

    // 6. Process each player to calculate their stats
    const playerStats = await Promise.all(
      players.map(async (player) => {
        const teamAssignments = player.TeamAssignments || [];

        // Initialize stats with default values
        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        let totalPoints = 0; // For the player
        let teammateStats = {};

        // Iterate through each team assignment for the player
        for (const assignment of teamAssignments) {
          const gameResult = assignment.Gameweek?.GameResult || null;

          // If there's no game result, skip processing this assignment
          if (!gameResult) {
            continue;
          }

          const team = assignment.team;
          const teamScore = team === 'A' ? gameResult.teamA_score : gameResult.teamB_score;
          const opponentScore = team === 'A' ? gameResult.teamB_score : gameResult.teamA_score;

          // Update goals stats for the player
          goalsFor += teamScore;
          goalsAgainst += opponentScore;

          // Calculate game result points (basic points)
          let gamePoints = 0;
          if (teamScore > opponentScore) {
            wins += 1;
            gamePoints = 3;
          } else if (teamScore < opponentScore) {
            losses += 1;
            gamePoints = 0;
          } else {
            draws += 1;
            gamePoints = 1;
          }

          // Total points for this gameweek for the player
          const totalGameweekPoints = gamePoints;
          totalPoints += totalGameweekPoints;

          // Fetch all teammates (players on the same team in the same gameweek)
          const teammates = await TeamAssignment.findAll({
            where: {
              gameweekId: assignment.gameweekId,
              team: assignment.team,
              playerId: {
                [Op.ne]: player.id, // Exclude the current player
              },
              roomId,
            },
          });

          // Update teammate stats
          teammates.forEach((teammate) => {
            if (!teammateStats[teammate.playerId]) {
              teammateStats[teammate.playerId] = {
                wins: 0,
                matchesPlayed: 0,
                goalDifference: 0, // Track goal difference
              };
            }

            // Increment match count for each teammate
            teammateStats[teammate.playerId].matchesPlayed += 1;

            // Update win and goal difference stats
            if (teamScore > opponentScore) {
              teammateStats[teammate.playerId].wins += 1;
            }
            teammateStats[teammate.playerId].goalDifference += teamScore - opponentScore;
          });
        }

        // Count teammates with at least 3 matches
        const eligibleTeammates = Object.entries(teammateStats).filter(
          ([_, stats]) => stats.matchesPlayed >= 3
        );

        // If there are no eligible teammates, return an empty array
        if (eligibleTeammates.length === 0) {
          player.dataValues.favoriteTeammates = [];
        } else {
          // Calculate the win rate for each eligible teammate and round to 2 decimal places
          eligibleTeammates.forEach(([teammateId, stats]) => {
            stats.winRate = parseFloat((stats.wins / stats.matchesPlayed).toFixed(2));
          });

          // Sort teammates by win rate, total wins, and goal difference
          eligibleTeammates.sort((a, b) => {
            const [_, statsA] = a;
            const [__, statsB] = b;

            if (statsB.winRate !== statsA.winRate) {
              return statsB.winRate - statsA.winRate;
            }
            if (statsB.wins !== statsA.wins) {
              return statsB.wins - statsA.wins;
            }
            return statsB.goalDifference - statsA.goalDifference;
          });

          // Select the top teammate as the favorite
          const [topTeammateId, topStats] = eligibleTeammates[0];

          // Fetch the favorite teammate's details from the database
          const favoriteTeammate = await Player.findOne({
            where: { id: topTeammateId },
            include: {
              model: RoomMembership,
              where: { roomId },
            },
          });

          // Attach the favorite teammate and their stats to the player's data as an array
          player.dataValues.favoriteTeammates = favoriteTeammate
            ? [
                {
                  ...favoriteTeammate.toJSON(),
                  reason: {
                    winRate: topStats.winRate,
                    matchesPlayedTogether: topStats.matchesPlayed,
                    goalDifferenceTogether: topStats.goalDifference,
                  },
                },
              ]
            : [];
        }

        // Attach Player of the Match count and general stats
        player.dataValues.wins = wins;
        player.dataValues.draws = draws;
        player.dataValues.losses = losses;
        player.dataValues.goalsFor = goalsFor;
        player.dataValues.goalsAgainst = goalsAgainst;
        player.dataValues.goalDifference = goalsFor - goalsAgainst;
        player.dataValues.points = totalPoints;
        player.dataValues.playerOfTheMatchCount = playerOfTheMatchCounts[player.id] || 0;

        return player;
      })
    );

    // 7. If there are no gameweeks, set all stats to 0
    // This is implicitly handled by initializing stats with 0 and only updating them if data exists

    // Return the final response
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
    const existingPlayer = await Player.findOne({ where: { auth0Id } });
    if (existingPlayer) {
      return res.status(400).json({ error: 'A player with this auth0Id already exists' });
    }

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

router.post('/players', protect, async (req, res) => {
  const { name } = req.body;
  const playerId = req.user.playerId;

  if (!name) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  try {
    const { roomId } = req.user;

    // Check for duplicate name in the same room
    const duplicateName = await Player.findOne({
      where: { name },
      include: {
        model: RoomMembership,
        where: { roomId },
      },
    });
    if (duplicateName) {
      return res.status(400).json({ error: 'Player name already exists in this room' });
    }

    const existingPlayers = await Player.findAll({
      include: {
        model: RoomMembership,
        where: { roomId },
      },
    });

    const totalRating = existingPlayers.reduce(
      (sum, player) => sum + parseFloat(player.rating || 0),
      0
    );
    const averageRating = existingPlayers.length > 0 ? totalRating / existingPlayers.length : 0;

    const newPlayer = await Player.create({ name, rating: averageRating });

    await Rating.create({
      playerId: newPlayer.id,
      date: new Date(),
      rating: averageRating,
      raterId: null,
      roomId,
    });

    await RoomMembership.create({
      playerId: newPlayer.id,
      roomId,
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
      where: { id },
      include: {
        model: RoomMembership,
        where: { roomId },
      },
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    await player.destroy();
    res.status(204).end();
  } catch (error) {
    console.error('Error deleting player', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/players/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    const { roomId } = req.user;

    const player = await Player.findOne({
      where: { id },
      include: {
        model: RoomMembership,
        where: { roomId },
      },
    });

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    player.name = name;
    await player.save();
    res.json(player);
  } catch (error) {
    console.error('Error updating player', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.post('/gameresults', protect, async (req, res) => {
  try {
    const { gameweekId, teamA_score, teamB_score } = req.body;
    const { roomId } = req.user;

    const teamA_player_count = await TeamAssignment.count({
      where: { gameweekId, team: 'A', roomId },
    });
    const teamB_player_count = await TeamAssignment.count({
      where: { gameweekId, team: 'B', roomId },
    });

    const [gameResult, created] = await GameResult.upsert(
      {
        gameweekId,
        teamA_score,
        teamB_score,
        teamA_player_count,
        teamB_player_count,
        roomId,
      },
      {
        returning: true,
      }
    );

    // Set the voting close time to 48 hours after the game result is recorded
    await Gameweek.update(
      { voting_close_time: sequelize.literal("NOW() + INTERVAL '48 HOURS'") },
      { where: { id: gameweekId, roomId } }
    );

    await updatePlayerRatings(gameweekId, roomId);
    res.json(gameResult);
  } catch (error) {
    console.error('Error recording game result:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

const updatePlayerRatings = async (gameweekId, roomId) => {
  try {
    const gameResult = await GameResult.findOne({
      where: { gameweekId, roomId },
      include: [Gameweek],
    });

    if (!gameResult) {
      console.error(`No game result found for gameweek ${gameweekId} in room ${roomId}`);
      return;
    }

    const teamAssignments = await TeamAssignment.findAll({
      where: { gameweekId, roomId },
      include: [Player],
    });

    const { teamA_score, teamB_score, teamA_player_count, teamB_player_count } = gameResult;

    for (const assignment of teamAssignments) {
      let points = 0;
      const isHandicappedWin = teamA_player_count !== teamB_player_count;
      const winPoints = isHandicappedWin
        ? assignment.team === 'A' && teamA_player_count > teamB_player_count
          ? 2
          : 4
        : 3;

      if (
        (assignment.team === 'A' && teamA_score > teamB_score) ||
        (assignment.team === 'B' && teamB_score > teamA_score)
      ) {
        points += winPoints;
      } else if (teamA_score === teamB_score) {
        points += 1;
      }

      if (assignment.team === 'A') {
        points += teamA_score * (teamA_player_count > teamB_player_count ? 0.1 : 0.2);
        if (teamA_player_count <= teamB_player_count) {
          points -= teamB_score * 0.1;
        }
      } else {
        points += teamB_score * (teamB_player_count > teamA_player_count ? 0.1 : 0.2);
        if (teamB_player_count <= teamA_player_count) {
          points -= teamA_score * 0.1;
        }
      }

      await Rating.create({
        playerId: assignment.playerId,
        date: gameResult.Gameweek.date,
        rating: points,
        raterId: null,
        roomId,
      });

      const ratings = await Rating.findAll({
        where: { playerId: assignment.playerId, roomId },
        limit: 5,
        order: [['date', 'DESC']],
      });

      const totalPoints = ratings.reduce((acc, rating) => acc + parseFloat(rating.rating || 0), 0);
      const player = await Player.findByPk(assignment.playerId);

      if (player) {
        player.rating = totalPoints;
        await player.save();
      }
    }
  } catch (error) {
    console.error('Error updating player ratings:', error);
  }
};

router.get('/gameresults', protect, async (req, res) => {
  try {
    const { roomId } = req.user;
    const gameResults = await GameResult.findAll({
      where: { roomId },
      include: [
        {
          model: Gameweek,
          where: { roomId },
        },
      ],
    });
    res.json(gameResults);
  } catch (error) {
    console.error('Error fetching game results', error);
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

    const availability = await Promise.all(
      playerIds.map(async (playerId) => {
        const player = await Player.findOne({
          include: {
            model: RoomMembership,
            where: { roomId },
          },
          where: { id: playerId },
        });
        if (!player) {
          throw new Error(`Player not found: ${playerId}`);
        }
        return Availability.upsert({ gameweekId, playerId, status, roomId });
      })
    );

    res.json(availability);
  } catch (error) {
    console.error('Error recording availability', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/manual-teamassignment', protect, async (req, res) => {
  const { gameweekId, playerId, team } = req.body;
  const { roomId } = req.user;

  try {
    // Verify the player and gameweek are valid
    const player = await Player.findOne({
      include: {
        model: RoomMembership,
        where: { roomId },
      },
      where: { id: playerId },
    });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const gameweek = await Gameweek.findOne({
      where: { id: gameweekId, roomId },
    });
    if (!gameweek) {
      return res.status(404).json({ error: 'Gameweek not found' });
    }

    // Manually assign the player to the specified team
    await TeamAssignment.upsert({
      gameweekId,
      playerId,
      team,
      roomId,
    });

    res.status(200).json({ message: 'Player assigned to team successfully' });
  } catch (error) {
    console.error('Error manually assigning player to team', error);
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

    const teamAssignments = await Promise.all(
      playerIds.map(async (playerId) => {
        const player = await Player.findOne({
          include: {
            model: RoomMembership,
            where: { roomId },
          },
          where: { id: playerId },
        });
        if (!player) {
          throw new Error(`Player not found: ${playerId}`);
        }
        return TeamAssignment.upsert({ gameweekId, playerId, team, roomId });
      })
    );

    res.json(teamAssignments);
  } catch (error) {
    console.error('Error recording team assignment:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/availability', protect, async (req, res) => {
  try {
    const { gameweekId } = req.query;
    const { roomId } = req.user;

    const availability = await Availability.findAll({
      where: { gameweekId, roomId },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId },
          },
        },
        {
          model: Gameweek,
          where: { roomId },
        },
      ],
    });
    res.json(availability);
  } catch (error) {
    console.error('Error fetching availability:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/ratings', protect, async (req, res) => {
  try {
    const { date, ratings } = req.body;
    const { roomId } = req.user;

    const ratingRecords = await Promise.all(
      ratings.map(async (rating) => {
        const player = await Player.findOne({
          include: {
            model: RoomMembership,
            where: { roomId },
          },
          where: { id: rating.playerId },
        });
        if (!player) {
          throw new Error(`Player not found: ${rating.playerId}`);
        }
        return Rating.create({
          date,
          playerId: rating.playerId,
          rating: rating.rating,
          raterId: rating.raterId,
          roomId,
        });
      })
    );
    res.json(ratingRecords);
  } catch (error) {
    console.error('Error recording ratings:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/ratings', protect, async (req, res) => {
  try {
    const { date } = req.query;
    const { roomId } = req.user;

    const ratings = await Rating.findAll({
      where: { date, roomId },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId },
          },
        },
      ],
      attributes: ['playerId', [sequelize.fn('AVG', sequelize.col('rating')), 'avgRating']],
      group: ['playerId'],
    });
    res.json(ratings);
  } catch (error) {
    console.error('Error fetching ratings:', error);
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
    console.error('Error creating gameweek:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/gameweeks', protect, async (req, res) => {
  try {
    const { roomId } = req.user;

    const gameweeks = await Gameweek.findAll({
      where: { roomId },
      include: [
        {
          model: GameResult,
          required: false, // LEFT JOIN to include gameweeks without results
          attributes: ['teamA_score', 'teamB_score', 'createdAt'],
        },
      ],
      order: [['date', 'DESC']], // Optional: Order by date descending
    });

    const gameweekData = await Promise.all(
      gameweeks.map(async (gameweek) => {
        const gameweekId = gameweek.id;
        const gameResult = gameweek.GameResult;

        // Calculate voting close time dynamically based on the GameResult's createdAt timestamp
        let votingCloseTime = null;

        if (gameResult) {
          // Use Date.parse() to correctly parse the GameResult's createdAt date including the timezone offset
          const parsedCreatedAt = new Date(Date.parse(gameResult.createdAt));

          // Calculate voting close time by adding 48 hours to the GameResult's createdAt
          votingCloseTime = new Date(parsedCreatedAt.getTime() + 48 * 60 * 60 * 1000);
        }

        const votes = await Vote.findAll({
          where: { gameweek_id: gameweekId, roomId },
          attributes: [
            'voted_player_id',
            [sequelize.fn('COUNT', sequelize.col('voted_player_id')), 'vote_count'],
          ],
          group: ['voted_player_id'],
          order: [[sequelize.literal('vote_count'), 'DESC']],
        });

        let playerOfTheMatch = [];

        if (votes.length > 0) {
          const topVoteCount = votes[0].dataValues.vote_count;

          // Find all players tied for the top vote count
          const topVotes = votes.filter((vote) => vote.dataValues.vote_count === topVoteCount);

          // Fetch all players tied for the top spot
          for (const vote of topVotes) {
            const player = await Player.findByPk(vote.voted_player_id, {
              attributes: ['id', 'name'],
            });
            if (player) {
              playerOfTheMatch.push(player.name); // Add player name to array
            }
          }
        }

        return {
          ...gameweek.toJSON(),
          playerOfTheMatch: playerOfTheMatch.length > 0 ? playerOfTheMatch : ['No votes'], // Return array or message
          votingCloseTime, // Dynamically calculated
        };
      })
    );

    res.json(gameweekData);
  } catch (error) {
    console.error('Error fetching gameweeks:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// **New Route: GET /gameweeks/:id**
router.get('/gameweeks/:id', protect, async (req, res) => {
  const { id } = req.params;
  const { roomId } = req.user;

  try {
    const gameweek = await Gameweek.findOne({
      where: { id, roomId },
      include: [
        {
          model: GameResult,
          required: false,
          attributes: ['teamA_score', 'teamB_score', 'createdAt'],
        },
      ],
    });

    if (!gameweek) {
      return res.status(404).json({ error: 'Gameweek not found' });
    }

    const gameweekId = gameweek.id;
    const gameResult = gameweek.GameResult;

    // Calculate voting close time dynamically based on the GameResult's createdAt timestamp
    let votingCloseTime = null;

    if (gameResult) {
      // Use Date.parse() to correctly parse the GameResult's createdAt date including the timezone offset
      const parsedCreatedAt = new Date(Date.parse(gameResult.createdAt));

      // Calculate voting close time by adding 48 hours to the GameResult's createdAt
      votingCloseTime = new Date(parsedCreatedAt.getTime() + 48 * 60 * 60 * 1000);
    }

    const votes = await Vote.findAll({
      where: { gameweek_id: gameweekId, roomId },
      attributes: [
        'voted_player_id',
        [sequelize.fn('COUNT', sequelize.col('voted_player_id')), 'vote_count'],
      ],
      group: ['voted_player_id'],
      order: [[sequelize.literal('vote_count'), 'DESC']],
    });

    let playerOfTheMatch = [];

    if (votes.length > 0) {
      const topVoteCount = votes[0].dataValues.vote_count;

      // Find all players tied for the top vote count
      const topVotes = votes.filter((vote) => vote.dataValues.vote_count === topVoteCount);

      // Fetch all players tied for the top spot
      for (const vote of topVotes) {
        const player = await Player.findByPk(vote.voted_player_id, {
          attributes: ['id', 'name'],
        });
        if (player) {
          playerOfTheMatch.push(player.name); // Add player name to array
        }
      }
    }

    res.json({
      ...gameweek.toJSON(),
      playerOfTheMatch: playerOfTheMatch.length > 0 ? playerOfTheMatch : ['No votes'],
      votingCloseTime,
    });
  } catch (error) {
    console.error(`Error fetching gameweek with ID ${id}:`, error);
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
    console.error('Error deleting gameweek:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/teamassignments', protect, async (req, res) => {
  try {
    const { gameweekId } = req.query;
    const { roomId } = req.user;

    const assignments = await TeamAssignment.findAll({
      where: { gameweekId, roomId },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId },
          },
        },
      ],
    });
    res.json(assignments);
  } catch (error) {
    console.error('Error fetching team assignments:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/votes', protect, async (req, res) => {
  try {
    const { gameweekId, votedPlayerId } = req.body;
    const { roomId, playerId: currentUserId } = req.user;

    // Fetch the gameweek assignments to check if the user played in this gameweek
    const playerAssignment = await TeamAssignment.findOne({
      where: {
        gameweekId,
        playerId: currentUserId,
        roomId,
      },
    });

    if (!playerAssignment) {
      return res.status(403).json({ error: 'You did not play in this gameweek and cannot vote.' });
    }

    // Prevent self-voting
    if (currentUserId === votedPlayerId) {
      return res.status(403).json({ error: 'You cannot vote for yourself.' });
    }

    // Check if the user has already voted in this gameweek
    const existingVote = await Vote.findOne({
      where: { gameweek_id: gameweekId, voting_player_id: currentUserId, roomId },
    });

    if (existingVote) {
      return res.status(403).json({ error: 'You have already voted in this gameweek.' });
    }

    // Proceed to save the vote
    const vote = await Vote.create({
      gameweek_id: gameweekId,
      voted_player_id: votedPlayerId,
      voting_player_id: currentUserId,
      roomId,
    });

    return res.status(201).json({ message: 'Vote cast successfully!', vote });
  } catch (error) {
    console.error('Error casting vote:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.get('/has-voted', protect, async (req, res) => {
  const { gameweekId } = req.query;
  const { playerId: voting_player_id, roomId } = req.user;

  try {
    const vote = await Vote.findOne({
      where: {
        gameweek_id: gameweekId,
        voting_player_id,
        roomId,
      },
    });

    if (vote) {
      return res.json({ hasVoted: true, player_id: voting_player_id });
    } else {
      return res.json({ hasVoted: false, player_id: voting_player_id });
    }
  } catch (error) {
    console.error('Error checking voting status:', error);
    res.status(500).json({ error: 'Error checking voting status' });
  }
});

module.exports = router;
