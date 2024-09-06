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

// Middleware to protect routes and set roomId
const protect = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    console.error('No token provided');
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) {
      console.error('Failed to decode token');
      return res.status(401).json({ error: 'Invalid token' });
    }

    const kid = decoded.header.kid;
    const key = await client.getSigningKey(kid);
    const signingKey = key.getPublicKey();

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

        req.user = decodedToken;

        // Check if the user's auth0Id is linked to any player in any room
        const player = await Player.findOne({ where: { auth0Id: req.user.sub } });
        if (player) {
          const membership = await RoomMembership.findOne({ where: { auth0Id: req.user.sub } });
          if (membership) {
            req.user.roomId = membership.roomId;
          }
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

    let player = await Player.findOne({ where: { auth0Id } });

    if (player) {
      const existingMembership = await RoomMembership.findOne({
        where: { auth0Id, roomId: room.id },
      });
      if (existingMembership) {
        return res.status(400).json({ message: 'Already a member of this room' });
      }

      await RoomMembership.create({ playerId: player.id, auth0Id, roomId: room.id });
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

      await RoomMembership.update({ auth0Id }, { where: { playerId, roomId: room.id } });
    } else if (newPlayerName !== null) {
      const newPlayer = await Player.create({ auth0Id, name: newPlayerName });
      await RoomMembership.create({ playerId: newPlayer.id, auth0Id, roomId: room.id });
    } else {
      const accessToken = req.headers.authorization.split(' ')[1];
      const userInfoResponse = await axios.get(`https://${auth0Domain}/userinfo`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      const username = userInfoResponse.data.name;

      const newPlayer = await Player.create({ auth0Id, name: username });
      await RoomMembership.create({ playerId: newPlayer.id, auth0Id, roomId: room.id });
    }

    res.status(200).json({ message: 'Joined room successfully' });
  } catch (error) {
    console.error('Error finalizing room join:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.post('/unlink-player', protect, async (req, res) => {
  const auth0Id = req.user.sub;

  try {
    const player = await Player.findOne({ where: { auth0Id } });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    player.auth0Id = null;
    await player.save();

    await RoomMembership.update({ auth0Id: null }, { where: { auth0Id } });

    res.status(200).json({ message: 'Player unlinked successfully' });
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
          where: { gameweekId, status: true },
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

    await TeamAssignment.destroy({ where: { gameweekId } });

    await TeamAssignment.bulkCreate([
      ...teamA.map((playerId) => ({ playerId, gameweekId, team: 'A' })),
      ...teamB.map((playerId) => ({ playerId, gameweekId, team: 'B' })),
    ]);

    res.json({ message: 'Teams assigned successfully' });
  } catch (error) {
    console.error('Error picking teams:', error);
    res.status(500).json({ error: 'Error picking teams' });
  }
});

router.get('/check-room-membership', protect, async (req, res) => {
  const auth0Id = req.user.sub;

  try {
    const membership = await RoomMembership.findOne({
      where: { auth0Id },
      include: Room,
    });

    if (membership) {
      res.status(200).json({
        hasJoinedRoom: true,
        roomCode: membership.Room.code,
        roomName: membership.Room.name,
      });
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
    const { roomId } = req.user;

    if (!roomId) {
      return res.status(400).json({ error: 'User is not associated with any room' });
    }

    // Fetch all players in the room
    const players = await Player.findAll({
      include: [
        {
          model: RoomMembership,
          where: { roomId },
        },
        {
          model: TeamAssignment,
          include: [
            {
              model: Gameweek,
              include: [
                {
                  model: GameResult,
                },
              ],
            },
          ],
        },
      ],
    });

    const playerStats = await Promise.all(
      players.map(async (player) => {
        const teamAssignments = player.TeamAssignments;

        let wins = 0;
        let draws = 0;
        let losses = 0;
        let goalsFor = 0;
        let goalsAgainst = 0;
        let totalPoints = 0; // For the player
        let teammateStats = {};

        console.log(`Processing player ${player.name} (ID: ${player.id})`);

        // Iterate through each team assignment for the player
        for (const assignment of teamAssignments) {
          const gameResult = assignment.Gameweek.GameResult;

          // Skip if there is no result for the gameweek (i.e., player didn't play or result wasn't recorded)
          if (!gameResult) {
            console.log(`Skipping gameweek ${assignment.gameweekId} (no result)`);
            continue;
          }

          const team = assignment.team;
          const teamScore = team === 'A' ? gameResult.teamA_score : gameResult.teamB_score;
          const opponentScore = team === 'A' ? gameResult.teamB_score : gameResult.teamA_score;
          const teamPlayerCount = team === 'A' ? gameResult.teamA_player_count : gameResult.teamB_player_count;
          const opponentPlayerCount = team === 'A' ? gameResult.teamB_player_count : gameResult.teamA_player_count;

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

          // Calculate goal-based points
          let goalPoints = 0;
          const isHandicapped = teamPlayerCount !== opponentPlayerCount;

          if (isHandicapped) {
            if (teamPlayerCount > opponentPlayerCount) {
              // Team has more players
              goalPoints += teamScore * 0.1; // Goals scored
              goalPoints -= opponentScore * 0.1; // Goals conceded
            } else {
              // Team has fewer players
              goalPoints += teamScore * 0.2; // Goals scored
              goalPoints -= opponentScore * 0.1; // Goals conceded
            }
          } else {
            // Balanced game
            goalPoints += teamScore * 0.2; // Goals scored
            goalPoints -= opponentScore * 0.1; // Goals conceded
          }

          // Total points for this gameweek for the player
          const totalGameweekPoints = gamePoints + goalPoints;
          totalPoints += totalGameweekPoints;

          // Fetch all teammates (players on the same team in the same gameweek)
          const teammates = await TeamAssignment.findAll({
            where: {
              gameweekId: assignment.gameweekId,
              team: assignment.team,
              playerId: {
                [Op.ne]: player.id, // Exclude the current player
              },
            },
          });

          // Update teammate stats
          teammates.forEach((teammate) => {
            if (!teammateStats[teammate.playerId]) {
              teammateStats[teammate.playerId] = {
                wins: 0,
                points: 0,
                goalsFor: 0,
                goalsAgainst: 0, // Add goalsAgainst tracking for teammates
              };
            }

            // Update stats for this teammate
            if (teamScore > opponentScore) {
              teammateStats[teammate.playerId].wins += 1;
            }

            teammateStats[teammate.playerId].points += totalGameweekPoints; // Points from this game
            teammateStats[teammate.playerId].goalsFor += teamScore; // Goals scored together
            teammateStats[teammate.playerId].goalsAgainst += opponentScore; // Goals conceded together
          });
        }

        // Determine favorite teammate(s) based on wins, points, and goals
        let favoriteTeammateIds = [];
        let bestStat = { wins: 0, points: 0, goalsFor: 0, goalsAgainst: 0 }; // Add goalsAgainst for comparison
        let favoriteReasons = {}; // Store reasons for favorite

        for (const teammateId in teammateStats) {
          const stats = teammateStats[teammateId];

          if (
            stats.wins > bestStat.wins ||
            (stats.wins === bestStat.wins && stats.points > bestStat.points) ||
            (stats.wins === bestStat.wins && stats.points === bestStat.points && stats.goalsFor > bestStat.goalsFor)
          ) {
            bestStat = stats;
            favoriteTeammateIds = [teammateId]; // Reset to new best teammate
            favoriteReasons[teammateId] = {
              winsTogether: stats.wins,
              pointsTogether: stats.points,
              goalsForTogether: stats.goalsFor,
              goalsAgainstTogether: stats.goalsAgainst, // Include goalsAgainst in the reasons
            };
          } else if (
            stats.wins === bestStat.wins &&
            stats.points === bestStat.points &&
            stats.goalsFor === bestStat.goalsFor
          ) {
            favoriteTeammateIds.push(teammateId); // Add tied teammate
            favoriteReasons[teammateId] = {
              winsTogether: stats.wins,
              pointsTogether: stats.points,
              goalsForTogether: stats.goalsFor,
              goalsAgainstTogether: stats.goalsAgainst, // Include goalsAgainst in the reasons
            };
          }
        }

        // Fetch the favorite teammates from the database
        const favoriteTeammates = await Player.findAll({
          where: { id: favoriteTeammateIds },
        });

        // Attach the calculated stats and favorite teammate(s) to the player's data
        player.dataValues.wins = wins;
        player.dataValues.draws = draws;
        player.dataValues.losses = losses;
        player.dataValues.goalsFor = goalsFor;
        player.dataValues.goalsAgainst = goalsAgainst;
        player.dataValues.goalDifference = goalsFor - goalsAgainst; // Calculate goal difference
        player.dataValues.points = totalPoints;

        // Attach favorite teammates along with reasons
        player.dataValues.favoriteTeammates = favoriteTeammates.length > 0
          ? favoriteTeammates.map(teammate => ({
              ...teammate.toJSON(), // Convert Sequelize instance to JSON
              reason: favoriteReasons[teammate.id], // Attach the reason for being the favorite
            }))
          : null;

        return player;
      })
    );

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
  const auth0Id = req.user.sub;

  if (!name) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  try {
    const duplicateName = await Player.findOne({ where: { name } });
    if (duplicateName) {
      return res.status(400).json({ error: 'Player name already exists' });
    }

    const currentUserMembership = await RoomMembership.findOne({ where: { auth0Id } });

    if (!currentUserMembership) {
      return res.status(400).json({ error: 'User is not a member of any room' });
    }

    const roomId = currentUserMembership.roomId;

    const existingPlayers = await Player.findAll({
      include: {
        model: RoomMembership,
        where: { roomId },
      },
    });

    const totalRating = existingPlayers.reduce((sum, player) => sum + parseFloat(player.rating || 0), 0);
    const averageRating = existingPlayers.length > 0 ? totalRating / existingPlayers.length : 0;

    const newPlayer = await Player.create({ name, rating: averageRating });

    await Rating.create({
      playerId: newPlayer.id,
      date: new Date(),
      rating: averageRating,
      raterId: null,
    });

    await RoomMembership.create({
      playerId: newPlayer.id,
      auth0Id: null,
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
      include: {
        model: RoomMembership,
        where: { roomId },
      },
      where: { id },
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
      include: {
        model: RoomMembership,
        where: { roomId },
      },
      where: { id },
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
      where: { gameweekId, team: 'A' },
    });
    const teamB_player_count = await TeamAssignment.count({
      where: { gameweekId, team: 'B' },
    });

    const [gameResult, created] = await GameResult.upsert(
      {
        gameweekId,
        teamA_score,
        teamB_score,
        teamA_player_count,
        teamB_player_count,
      },
      {
        returning: true,
      }
    );

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
      include: [Gameweek],
    });

    if (!gameResult) {
      console.error(`No game result found for gameweek ${gameweekId}`);
      return;
    }

    const teamAssignments = await TeamAssignment.findAll({
      where: { gameweekId },
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
      });

      const ratings = await Rating.findAll({
        where: { playerId: assignment.playerId },
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
        return Availability.upsert({ gameweekId, playerId, status });
      })
    );

    res.json(availability);
  } catch (error) {
    console.error('Error recording availability', error);
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
        return TeamAssignment.upsert({ gameweekId, playerId, team });
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
      where: { gameweekId },
      include: [
        {
          model: Player,
          include: {
            model: RoomMembership,
            where: { roomId },
          },
        },
        Gameweek,
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
      where: { date },
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

    const gameweeks = await Gameweek.findAll({ where: { roomId } });
    res.json(gameweeks);
  } catch (error) {
    console.error('Error fetching gameweeks:', error);
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
      where: { gameweekId },
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



module.exports = router;
