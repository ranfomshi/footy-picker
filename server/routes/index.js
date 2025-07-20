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
  Sport,
  Achievement,
  PlayerAchievements
} = require('../models');
const { pickBalancedTeams } = require('../services/teamPicker'); // team picking logic
const router = express.Router();
const { Op } = require('sequelize');
const jwt = require('jsonwebtoken');
const axios = require('axios');

// Auth0 Management API helper functions
let managementToken = null;
let tokenExpiry = null;

const getManagementToken = async () => {
  // Check if we have a valid token
  if (managementToken && tokenExpiry && Date.now() < tokenExpiry) {
    console.log('🔄 Using cached Auth0 management token');
    return managementToken;
  }

  console.log('🔑 Requesting new Auth0 management token...');
  console.log('Auth0 Domain:', process.env.AUTH0_DOMAIN);
  console.log('Auth0 Client ID:', process.env.AUTH0_CLIENT_ID ? 'SET' : 'NOT SET');
  console.log('Auth0 Client Secret:', process.env.AUTH0_CLIENT_SECRET ? 'SET' : 'NOT SET');

  try {
    const response = await axios.post(`https://${process.env.AUTH0_DOMAIN}/oauth/token`, {
      client_id: process.env.AUTH0_CLIENT_ID,
      client_secret: process.env.AUTH0_CLIENT_SECRET,
      audience: `https://${process.env.AUTH0_DOMAIN}/api/v2/`,
      grant_type: 'client_credentials'
    });

    managementToken = response.data.access_token;
    // Set expiry to 5 minutes before actual expiry for safety
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;
    
    console.log('✅ Auth0 management token obtained successfully');
    console.log('Token expires in:', response.data.expires_in, 'seconds');
    return managementToken;
  } catch (error) {
    console.error('❌ Failed to get Auth0 management token:');
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    return null;
  }
};const getAuth0UserProfile = async (auth0Id) => {
  console.log('👤 Fetching Auth0 profile for user:', auth0Id);
  
  try {
    const token = await getManagementToken();
    if (!token) {
      console.log('❌ No management token available for user:', auth0Id);
      return null;
    }

    console.log('🌐 Making Auth0 Management API call for user:', auth0Id);
    const response = await axios.get(
      `https://${process.env.AUTH0_DOMAIN}/api/v2/users/${encodeURIComponent(auth0Id)}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log('✅ Auth0 profile data received for user:', auth0Id);
    console.log('Profile picture URL:', response.data.picture || 'NO PICTURE');
    console.log('Profile name:', response.data.name || 'NO NAME');
    console.log('Profile email:', response.data.email || 'NO EMAIL');

    return {
      picture: response.data.picture,
      name: response.data.name,
      email: response.data.email,
    };
  } catch (error) {
    console.error(`❌ Failed to fetch Auth0 profile for ${auth0Id}:`);
    console.error('Error message:', error.message);
    console.error('Response status:', error.response?.status);
    console.error('Response data:', error.response?.data);
    return null;
  }
};

const jwksRsa = require('jwks-rsa');
const achievements = require('../references/achievementConditions');
const { saveFcmToken, sendRoomNotification } = require('../services/notifications'); // Import only the save function
const { getUnlinkedPlayers, completeRoomJoin } = require('../services/roomService');


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
// protect middleware
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

        // Attach the decoded token to the request object
        req.user = decodedToken;

        // Fetch active room membership
        const activeMembership = await RoomMembership.findOne({
          where: {
            auth0Id: decodedToken.sub,
            isActive: true,
          },
        });

        if (activeMembership) {
          req.user.roomId = activeMembership.roomId;
          req.user.playerId = activeMembership.playerId; // Set playerId
        } else {
          console.error('No active membership found for user:', decodedToken.sub);
        }

        next();
      }
    );
  } catch (error) {
    console.error('Error during token verification:', error);
    return res.status(401).json({ error: 'Token verification failed' });
  }
};

const adminOnly = async (req, res, next) => {
  try {
    // The `protect` middleware should already have stored:
    //   req.user.playerId
    //   req.user.roomId
    // so we can look up the membership:

    const membership = await RoomMembership.findOne({
      where: {
        playerId: req.user.playerId,
        roomId: req.user.roomId,
        isActive: true,
      },
    });

    // If no membership or isAdmin is false, reject
    if (!membership || !membership.isAdmin) {
      return res.status(403).json({ error: 'Admin privileges required.' });
    }

    // Otherwise, proceed
    next();
  } catch (error) {
    console.error('Error in adminOnly middleware:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
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
    // Check if user has ANY membership row
    const memberships = await RoomMembership.findAll({ where: { auth0Id, isMember: true } });

    if (memberships.length > 0) {
      // user has at least one membership
      return res.status(200).json({ exists: true, memberships });
    } else {
      return res.status(200).json({ exists: false });
    }
  } catch (error) {
    console.error('Error checking membership existence:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.get('/current-player', protect, async (req, res) => {
  try {
    const { playerId, roomId } = req.user; // from protect middleware

    if (!playerId) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 1) Fetch the player
    const player = await Player.findByPk(playerId, {
      attributes: ['id', 'name', 'rating'],
    });
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    // 2) Fetch active membership for this player in the active room
    const membership = await RoomMembership.findOne({
      where: {
        playerId: playerId,
        roomId: roomId,
        isActive: true,
      },
    });

    // 3) Build the response object
    // If there's no membership, default isAdmin to false
    const response = {
      ...player.toJSON(),
      isAdmin: membership ? membership.isAdmin : false,
      favoritePositions: membership?.favoritePositions || [],
    };

    // 4) Send response
    return res.json(response);
  } catch (error) {
    console.error('Error fetching current player:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/create-room', protect, async (req, res) => {
  // Extract and coerce sportId
  const { name, playerName, teamAColor, teamBColor } = req.body;
  const sportId = parseInt(req.body.sportId, 10);
  console.log('Creating room with sportId:', sportId);
  const auth0Id = req.user.sub;
  const code = generateRoomCode();

  try {
    // Validate sport
    const sport = await Sport.findByPk(sportId);
    if (!sport) {
      return res.status(400).json({ error: 'Invalid sport ID' });
    }

    // Determine player name from request or Auth0
    let finalPlayerName = playerName;
    if (!finalPlayerName) {
      const token = req.headers.authorization.split(' ')[1];
      const userInfo = await axios.get(`https://${auth0Domain}/userinfo`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      finalPlayerName = userInfo.data.name || 'Unnamed Player';
    }

    // Create room with colours
    const room = await Room.create({ name, code, sportId, teamAColor, teamBColor });

    // Deactivate other memberships
    await RoomMembership.update(
      { isActive: false },
      { where: { auth0Id } }
    );

    // Create creator player & membership
    const newPlayer = await Player.create({ name: finalPlayerName });
    const newMembership = await RoomMembership.create({
      playerId: newPlayer.id,
      roomId: room.id,
      auth0Id,
      isActive: true,
      isAdmin: true
    });

    return res.status(201).json({
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        sport: sport.name,
        teamAColor: room.teamAColor,
        teamBColor: room.teamBColor
      },
      membership: newMembership
    });
  } catch (error) {
    console.error('Error creating room:', error.message);
    return res.status(500).json({ error: error.message || 'Internal Server Error' });
  }
});

// Update room endpoint (admin only)
router.put('/rooms/:id', protect, adminOnly, async (req, res) => {
  const { id } = req.params;
  const { name, sportId, teamAColor, teamBColor } = req.body;

  try {
    // Find the room by primary key (id)
    const room = await Room.findByPk(id);
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // (Optional) Validate sportId if provided
    if (sportId) {
      const sport = await Sport.findByPk(sportId);
      if (!sport) {
        return res.status(400).json({ error: 'Invalid sport ID' });
      }
    }

    // Update the room's fields only if provided; otherwise, leave them unchanged.
    room.name = name || room.name;
    room.sportId = sportId || room.sportId;
    room.teamAColor = teamAColor || room.teamAColor;
    room.teamBColor = teamBColor || room.teamBColor;

    await room.save();

    // Return the updated room object.
    return res.status(200).json({
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        sportId: room.sportId,
        teamAColor: room.teamAColor,
        teamBColor: room.teamBColor,
      },
    });
  } catch (error) {
    console.error('Error updating room:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.post('/join-room', protect, async (req, res) => {
  const { code } = req.body;
  const auth0Id = req.user.sub;

  try {
    // 1) Find the room
    const room = await Room.findOne({ where: { code } });
    if (!room) {
      return res.status(404).json({ status: 'error', message: 'Room not found' });
    }

    // 2) Check existing membership
    const existing = await RoomMembership.findOne({
      where: { auth0Id, roomId: room.id },
    });
    if (existing) {
      return res.status(200).json({
        status: 'success',
        message: 'Already a member of this room',
      });
    }

    // 3) Fetch unlinked players
    const unlinkedPlayers = await getUnlinkedPlayers(room.id);

    // 4) Return slots to client
    return res.status(200).json({ status: 'unlinked', unlinkedPlayers });
  } catch (err) {
    console.error('Error in join-room:', err);
    return res.status(500).json({ status: 'error', message: 'Internal Server Error' });
  }
});



router.post('/finalize-join-room', protect, async (req, res) => {
  const { roomCode, playerId, newPlayerName } = req.body;
  const auth0Id = req.user.sub;

  try {
    // Delegate to transactional service
    const { room, membership } = await completeRoomJoin({ roomCode, playerId, newPlayerName, auth0Id });

    return res.status(200).json({
      success: true,
      room: {
        id: room.id,
        name: room.name,
        code: room.code,
        teamAColor: room.teamAColor,
        teamBColor: room.teamBColor,
        isAdmin: membership.isAdmin,
      },
    });
  } catch (err) {
    console.error('Error in finalize-join-room:', err.message);
    const status = err.message === 'Room not found' ? 404 : 400;
    return res.status(status).json({ status: 'error', message: err.message });
  }
});





router.post('/unlink-player', protect, async (req, res) => {
  const auth0Id = req.user.sub;
  const { roomCode } = req.body;

  try {
    // Find the membership row for this user and room
    const room = await Room.findOne({ where: { code: roomCode } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const membership = await RoomMembership.findOne({
      where: { auth0Id, roomId: room.id },
    });
    if (!membership) {
      return res.status(404).json({ error: 'Membership not found in this room for user' });
    }

    // Unlink
    await membership.update({ auth0Id: null, isActive: false });
    return res.status(200).json({ message: 'Player unlinked successfully' });

  } catch (error) {
    console.error('Error unlinking player:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/pick-teams', protect, async (req, res) => {
  const { gameweekId } = req.query;
  const { roomId } = req.user;

  try {
    // Fetch available players (including favoritePositions)
    const players = await Player.findAll({
      include: [
        {
          model: Availability,
          where: { gameweekId, status: true, roomId },
        },
        {
          model: RoomMembership,
          where: { roomId },
          attributes: ['favoritePositions'],
        },
      ],
      order: [['rating', 'DESC']],
    });

    // Create a simplified array of players with relevant fields
    const enrichedPlayers = players.map((player) => {
      const fp = player.RoomMemberships?.[0]?.favoritePositions || [];
      return {
        id: player.id,
        rating: parseFloat(player.rating || 0),
        favoritePositions: fp,
      };
    });

    // Decide which threshold to use based on the total number of players
    const totalPlayers = enrichedPlayers.length;
    let threshold;

    if (totalPlayers == 6) {
      threshold = 0.5;   // 50%
    } else if (totalPlayers == 7 || totalPlayers == 8) {
      threshold = 0.4;   // 40%
    } else if (totalPlayers == 9 || totalPlayers == 10) {
      threshold = 0.3;   // 30%
    } else if (totalPlayers == 11 || totalPlayers == 12) {
      threshold = 0.25;  // 25%
    } else if (totalPlayers > 12) {
      threshold = 0.15;  // 15%
    }


    // Attempt to pick balanced teams using the computed threshold
    const teamResult = await pickBalancedTeams(enrichedPlayers, threshold);

    if (!teamResult) {
      return res
        .status(400)
        .json({
          error: `Unable to form balanced teams within the threshold of ${Number.isFinite(threshold) ? `${threshold * 100}%` : 'no limit'
            }.`
        });
    }

    const { teamA, teamB } = teamResult;

    // Store the team assignments
    await TeamAssignment.destroy({ where: { gameweekId, roomId } });
    await TeamAssignment.bulkCreate([
      ...teamA.map((p) => ({ playerId: p.id, gameweekId, team: 'A', roomId })),
      ...teamB.map((p) => ({ playerId: p.id, gameweekId, team: 'B', roomId })),
    ]);

    return res.json({
      message: 'Teams assigned successfully',
      teamA: teamA.map((p) => p.id),
      teamB: teamB.map((p) => p.id),
    });
  } catch (error) {
    console.error('Error picking teams:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});




router.get('/check-room-membership', protect, async (req, res) => {
  const auth0Id = req.user.sub;

  try {
    // Find all memberships for this user based on auth0Id in RoomMembership
    const memberships = await RoomMembership.findAll({
      where: { auth0Id },
      include: [
        {
          model: Room,
          include: {
            model: Sport,
            attributes: ['id', 'name'], // Fetch only id and name of the sport
          },
        },
        {
          model: Player, // ✅ Include the Player model to fetch playerId
          attributes: ['id'], // Only fetch playerId
        },
      ],
    });

    // Build an array of "joinedRooms" from the membership data.
    const joinedRooms = memberships.map((membership) => ({
      id: membership.Room.id,
      name: membership.Room.name,
      code: membership.Room.code,
      sport: membership.Room.Sport?.name || 'Unknown',
      sportId: membership.Room.Sport?.id || 'Unknown',
      playerId: membership.Player?.id || null, // ✅ Include playerId
      teamAColor: membership.Room.teamAColor || '#21C67C',
      teamBColor: membership.Room.teamBColor || '#FFC107',
    }));

    // Identify if there's an active membership.
    const activeMembership = memberships.find((m) => m.isActive);

    // Build the "activeRoom" object (or null if none), including team colours.
    const activeRoom = activeMembership
      ? {
        id: activeMembership.Room.id,
        name: activeMembership.Room.name,
        code: activeMembership.Room.code,
        sport: activeMembership.Room.Sport?.name || 'Unknown',
        sportId: activeMembership.Room.Sport?.id || 'Unknown',
        isAdmin: activeMembership.isAdmin,
        playerId: activeMembership.Player?.id || null, // ✅ Include playerId
        teamAColor: activeMembership.Room.teamAColor || '#21C67C',
        teamBColor: activeMembership.Room.teamBColor || '#FFC107',
      }
      : null;

    return res.status(200).json({
      activeRoom,
      joinedRooms,
    });
  } catch (error) {
    console.error('Error checking room membership:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});





router.post('/set-active-room', protect, async (req, res) => {
  const auth0Id = req.user.sub;
  const { roomId: roomCode } = req.body; // This is the room code

  try {
    // 1) Find the room by code
    const room = await Room.findOne({ where: { code: roomCode } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // 2) Find the membership row for this user in that room
    const membership = await RoomMembership.findOne({
      where: { auth0Id, roomId: room.id },
    });
    if (!membership) {
      return res.status(404).json({
        error: 'You do not have a membership in that room',
      });
    }

    // 3) Deactivate other memberships for this user
    await RoomMembership.update({ isActive: false }, { where: { auth0Id } });

    // 4) Activate membership for the chosen room
    await membership.update({ isActive: true });

    // 5) Return `isAdmin` in the response
    return res.status(200).json({
      success: true,
      activeRoom: {
        id: room.id,
        name: room.name,
        code: room.code,
        teamAColor: room.teamAColor, // New field
        teamBColor: room.teamBColor, // New field
        isAdmin: membership.isAdmin,
      },
    });
  } catch (error) {
    console.error('Error setting active room:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/players', protect, async (req, res) => {
  try {
    const { roomId } = req.user;
    
    console.log('🎮 Players endpoint called for room:', roomId);
    console.log('🔧 Environment check:');
    console.log('   AUTH0_DOMAIN:', process.env.AUTH0_DOMAIN || 'NOT SET');
    console.log('   AUTH0_CLIENT_ID:', process.env.AUTH0_CLIENT_ID ? 'SET' : 'NOT SET');
    console.log('   AUTH0_CLIENT_SECRET:', process.env.AUTH0_CLIENT_SECRET ? 'SET' : 'NOT SET');
    console.log('   AUTH0_AUDIENCE:', process.env.AUTH0_AUDIENCE || 'NOT SET');

    if (!roomId) {
      return res.status(400).json({ error: 'User is not associated with any room' });
    }

    // Fetch all players in the room
    const players = await Player.findAll({
      include: [
        {
          model: RoomMembership,
          where: { roomId, isMember: true },
          required: true,
          attributes: ['auth0Id', 'isAdmin'],
        },
        {
          model: TeamAssignment,
          where: { roomId },
          required: false,
          include: [
            {
              model: Gameweek,
              where: { roomId },
              required: false,
              include: [
                {
                  model: GameResult,
                  where: { roomId },
                  required: false,
                },
              ],
            },
          ],
        },
      ],
    });

    // Fetch all gameweeks in the room
    const gameweeks = await Gameweek.findAll({
      where: { roomId },
    });

    const gameweekIds = gameweeks.map((gw) => gw.id);

    // Fetch and aggregate votes
    const voteCounts = gameweekIds.length
      ? await Vote.findAll({
        where: {
          gameweek_id: { [Op.in]: gameweekIds },
          roomId,
        },
        attributes: [
          'gameweek_id',
          'voted_player_id',
          [sequelize.fn('COUNT', sequelize.col('voted_player_id')), 'vote_count'],
        ],
        group: ['gameweek_id', 'voted_player_id'],
      })
      : [];

    // Group votes by gameweek and rank players
    const rankedVotes = voteCounts.reduce((acc, vote) => {
      const { gameweek_id, voted_player_id, vote_count } = vote.get();

      if (!acc[gameweek_id]) acc[gameweek_id] = [];
      acc[gameweek_id].push({ voted_player_id, vote_count });

      return acc;
    }, {});

    const topVotesPerGameweek = Object.values(rankedVotes).flatMap((votes) =>
      votes
        .sort((a, b) => b.vote_count - a.vote_count)
        .filter((vote, index, arr) => vote.vote_count === arr[0].vote_count) // Keep ties
    );

    // Aggregate "Player of the Match" counts
    const playerOfTheMatchCounts = topVotesPerGameweek.reduce((acc, { voted_player_id }) => {
      acc[voted_player_id] = (acc[voted_player_id] || 0) + 1;
      return acc;
    }, {});

    // Calculate player stats
    const playerStats = await Promise.all(
      players.map(async (player) => {
        const auth0Id = player.RoomMemberships?.[0]?.auth0Id || null;
        const isAdmin = player.RoomMemberships?.[0]?.isAdmin || false;
        
        console.log(`🏃 Processing player: ${player.name} (ID: ${player.id})`);
        console.log(`   Auth0 ID: ${auth0Id || 'NOT SET'}`);
        
        // Fetch Auth0 profile picture if auth0Id exists
        let profilePicture = null;
        if (auth0Id) {
          console.log(`📸 Fetching profile picture for ${player.name}...`);
          const auth0Profile = await getAuth0UserProfile(auth0Id);
          profilePicture = auth0Profile?.picture || null;
          console.log(`   Result: ${profilePicture || 'NO PICTURE FOUND'}`);
        } else {
          console.log(`   Skipping Auth0 lookup - no auth0Id`);
        }        const teamAssignments = player.TeamAssignments || [];

        let wins = 0,
          draws = 0,
          losses = 0,
          goalsFor = 0,
          goalsAgainst = 0,
          totalPoints = 0;

        const teammateStats = {};
        let lastFiveGames = [];

        // Sort team assignments by gameweek timestamp in descending order
        const sortedAssignments = teamAssignments.sort((a, b) => {
          const dateA = new Date(a.Gameweek.date).getTime();
          const dateB = new Date(b.Gameweek.date).getTime();
          return dateB - dateA; // Most recent first
        });

        for (const assignment of sortedAssignments) {
          const gameResult = assignment.Gameweek?.GameResult;

          if (gameResult) {
            const teamScore =
              assignment.team === 'A' ? gameResult.teamA_score : gameResult.teamB_score;
            const opponentScore =
              assignment.team === 'A' ? gameResult.teamB_score : gameResult.teamA_score;

            goalsFor += teamScore;
            goalsAgainst += opponentScore;

            if (teamScore > opponentScore) {
              wins += 1;
              totalPoints += 3;
              lastFiveGames.push('win');
            } else if (teamScore === opponentScore) {
              draws += 1;
              totalPoints += 1;
              lastFiveGames.push('draw');
            } else {
              losses += 1;
              lastFiveGames.push('loss');
            }

            // Limit lastFiveGames to 5 entries
            if (lastFiveGames.length > 5) {
              lastFiveGames = lastFiveGames.slice(0, 5); // Keep only the first 5 entries
            }

            // Track teammate stats
            const teammates = await TeamAssignment.findAll({
              where: {
                gameweekId: assignment.gameweekId,
                team: assignment.team,
                playerId: { [Op.ne]: player.id },
                roomId,
              },
            });

            teammates.forEach((teammate) => {
              if (!teammateStats[teammate.playerId]) {
                teammateStats[teammate.playerId] = {
                  wins: 0,
                  matchesPlayed: 0,
                  goalDifference: 0,
                };
              }
              teammateStats[teammate.playerId].matchesPlayed += 1;

              if (teamScore > opponentScore) {
                teammateStats[teammate.playerId].wins += 1;
              }
              teammateStats[teammate.playerId].goalDifference += teamScore - opponentScore;
            });
          }
        }

        const favoriteTeammates = await Promise.all(
          Object.entries(teammateStats)
            .filter(([, stats]) => stats.matchesPlayed >= 3)
            .map(async ([id, stats]) => {
              const teammate = await Player.findOne({
                where: { id: parseInt(id, 10) },
                attributes: ['name'],
                include: [
                  {
                    model: RoomMembership,
                    where: { roomId },
                    attributes: ['auth0Id'],
                  },
                ],
              });

              // Fetch Auth0 profile picture for teammate
              let teammateProfilePicture = null;
              const teammateAuth0Id = teammate?.RoomMemberships?.[0]?.auth0Id;
              console.log(`👥 Processing teammate: ${teammate?.name} (ID: ${id})`);
              console.log(`   Teammate Auth0 ID: ${teammateAuth0Id || 'NOT SET'}`);
              
              if (teammateAuth0Id) {
                console.log(`📸 Fetching teammate profile picture...`);
                const teammateAuth0Profile = await getAuth0UserProfile(teammateAuth0Id);
                teammateProfilePicture = teammateAuth0Profile?.picture || null;
                console.log(`   Teammate result: ${teammateProfilePicture || 'NO PICTURE FOUND'}`);
              } else {
                console.log(`   Skipping Auth0 lookup for teammate - no auth0Id`);
              }

              return {
                id: parseInt(id, 10),
                name: teammate?.name || 'Unknown',
                auth0Id: teammateAuth0Id || null,
                profilePicture: teammateProfilePicture,
                winRate: parseFloat((stats.wins / stats.matchesPlayed).toFixed(2)),
                matchesPlayedTogether: stats.matchesPlayed,
                goalDifferenceTogether: stats.goalDifference,
              };
            })
        );

        // Sort favorite teammates by win rate (descending)
        favoriteTeammates.sort((a, b) => b.winRate - a.winRate);

        return {
          ...player.toJSON(),
          auth0Id,
          isAdmin,
          profilePicture,
          wins,
          draws,
          losses,
          goalsFor,
          goalsAgainst,
          goalDifference: goalsFor - goalsAgainst,
          totalPoints,
          playerOfTheMatchCount: playerOfTheMatchCounts[player.id] || 0,
          favoriteTeammates,
          lastFiveGames, // Include last five games in the response
        };
      })
    );

    res.json(playerStats);
  } catch (error) {
    console.error('Error fetching players:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


/**
 * PUT /players/:id/link
 * 
 * Instead of storing auth0Id on the Player, we store it in RoomMembership.
 * We'll assume the request body includes a `roomCode` (or `roomId`) and `auth0Id`.
 */
router.put('/players/:id/link', protect, async (req, res) => {
  const { id } = req.params;          // The Player ID we want to link
  const { roomCode, auth0Id } = req.body; // We now require a `roomCode` plus `auth0Id` in the request

  if (!roomCode || !auth0Id) {
    return res.status(400).json({ error: 'roomCode and auth0Id are required' });
  }

  try {
    // 1) Find the Room by its code
    const room = await Room.findOne({ where: { code: roomCode } });
    if (!room) {
      return res.status(404).json({ error: 'Room not found' });
    }

    // 2) Find the membership row for (playerId=id, roomId=room.id)
    let membership = await RoomMembership.findOne({
      where: { playerId: id, roomId: room.id },
    });
    if (!membership) {
      return res
        .status(404)
        .json({ error: 'No membership found for that player in this room' });
    }

    // 3) Check if that membership is already linked
    if (membership.auth0Id) {
      return res
        .status(400)
        .json({ error: 'This player is already linked to a user in this room' });
    }

    // 4) "Link" the user to this membership by setting membership.auth0Id
    await membership.update({ auth0Id });

    // 5) Return the updated membership (or the player, if you prefer)
    res.status(200).json({
      message: `Player ${id} linked to auth0Id ${auth0Id} in room ${room.code}`,
      membership,
    });
  } catch (error) {
    console.error('Error linking player to membership:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/players', protect, async (req, res) => {
  const { name, modifier = 'average' } = req.body; // Default to 'average'
  const { roomId } = req.user;

  if (!name) {
    return res.status(400).json({ error: 'Player name is required' });
  }

  try {
    // Check for duplicate player name in the room
    const existingPlayer = await Player.findOne({
      where: { name },
      include: {
        model: RoomMembership,
        where: { roomId },
      },
    });

    if (existingPlayer) {
      return res.status(400).json({ error: 'Player name already exists in this room' });
    }

    // Fetch all player ratings in the room
    const existingPlayers = await Player.findAll({
      include: {
        model: RoomMembership,
        where: { roomId },
      },
      attributes: ['rating'],
    });

    let newPlayerRating = 1000; // Default fallback if no players exist

    if (existingPlayers.length > 0) {
      const ratings = existingPlayers.map(p => parseFloat(p.rating || 0));
      const totalPlayers = ratings.length;

      const meanRating = ratings.reduce((sum, r) => sum + r, 0) / totalPlayers; // Mean (average)
      const bestRating = Math.max(...ratings);
      const worstRating = Math.min(...ratings);

      // Calculate interpolated ratings
      const betterThanAvg = (meanRating + bestRating) / 2; // Midway between mean and best
      const belowAvg = (meanRating + worstRating) / 2; // Midway between mean and worst

      // Assign rating based on modifier
      switch (modifier) {
        case 'better_than_average':
          newPlayerRating = betterThanAvg;
          break;
        case 'below_average':
          newPlayerRating = belowAvg;
          break;
        case 'best':
          newPlayerRating = bestRating;
          break;
        case 'worst':
          newPlayerRating = worstRating;
          break;
        default: // 'average' (default case)
          newPlayerRating = meanRating;
      }
    }

    // Create new player
    const newPlayer = await Player.create({ name, rating: newPlayerRating });

    // Save initial rating entry
    await Rating.create({
      playerId: newPlayer.id,
      date: new Date(),
      rating: newPlayerRating,
      raterId: null,
      roomId,
    });

    // Link player to room
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

    // find the membership
    const membership = await RoomMembership.findOne({
      where: { playerId: id, roomId }
    });
    if (!membership) {
      return res.status(404).json({ error: 'Player not found in this room' });
    }

    // soft-remove them
    await membership.update({ isMember: false });
    return res.status(204).end();
  } catch (err) {
    console.error('Error removing player:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
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

    // Count players in each team
    const teamA_player_count = await TeamAssignment.count({
      where: { gameweekId, team: 'A', roomId },
    });
    const teamB_player_count = await TeamAssignment.count({
      where: { gameweekId, team: 'B', roomId },
    });

    // Upsert game result
    const [gameResult] = await GameResult.upsert(
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

    // Update voting close time to 48 hours after game result
    await Gameweek.update(
      { voting_close_time: sequelize.literal("NOW() + INTERVAL '48 HOURS'") },
      { where: { id: gameweekId, roomId } }
    );

    // Update player ratings
    await updatePlayerRatings(gameweekId, roomId);

    // Fetch all team assignments
    const teamAssignments = await TeamAssignment.findAll({
      where: { gameweekId, roomId },
    });

    // Award achievements for all players
    for (const assignment of teamAssignments) {
      const { playerId, team } = assignment; // Extract playerId and team from assignment
      await checkAndAwardAchievements({
        playerId,
        roomId,
        assignment: { team }, // Include team in assignment
        teamA_score,
        teamB_score,
      });
    }

    res.json(gameResult);
  } catch (error) {
    console.error('Error recording game result:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


const checkAndAwardAchievements = async ({ playerId, roomId, assignment, teamA_score, teamB_score }) => {
  try {
    for (const achievement of achievements) {
      const isEligible = await achievement.condition({
        playerId,
        roomId,
        assignment,
        teamA_score,
        teamB_score,
      });
      if (isEligible) {
        await PlayerAchievements.upsert({
          playerId,
          achievementId: achievement.id,
          roomId,
          earnedAt: new Date(),
        });
      }
    }
  } catch (error) {
    console.error('Error checking and awarding achievements:', error);
    throw error;
  }
};





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

    const gameweek = await Gameweek.findOne({ where: { id: gameweekId, roomId } });
    if (!gameweek) {
      return res.status(404).json({ error: 'Gameweek not found' });
    }

    // 1) Count before change and guard against exceeding maxPlayers
    const beforeCount = await Availability.count({
      where: { gameweekId, status: true, roomId },
    });
    if (status && gameweek.maxPlayers && beforeCount + playerIds.length > gameweek.maxPlayers) {
      return res
        .status(400)
        .json({ error: `Max players (${gameweek.maxPlayers}) exceeded.` });
    }

    // 2) Upsert the availability rows
    await Promise.all(
      playerIds.map(async (playerId) => {
        const player = await Player.findOne({
          include: { model: RoomMembership, where: { roomId, isMember: true } },
          where: { id: playerId },
        });
        if (!player) throw new Error(`Player not found: ${playerId}`);
        return Availability.upsert({ gameweekId, playerId, status, roomId });
      })
    );

    // 3) Always auto‑pick teams
    //    (fetch the now‑available players, run your threshold logic, pick & store)
    const playersAvail = await Player.findAll({
      include: [
        { model: Availability, where: { gameweekId, status: true, roomId } },
        {
          model: RoomMembership,
          where: { roomId, isMember: true },
          attributes: ['favoritePositions'],
        },
      ],
      order: [['rating', 'DESC']],
    });
    const enriched = playersAvail.map((p) => ({
      id: p.id,
      rating: parseFloat(p.rating || 0),
      favoritePositions: p.RoomMemberships[0]?.favoritePositions || [],
    }));
    // compute threshold as before...
    const threshold = (() => {
      const n = enriched.length;
      if (n === 6) return 0.5;
      if (n <= 8) return 0.4;
      if (n <= 10) return 0.3;
      if (n <= 12) return 0.25;
      return 0.15;
    })();
    const picked = await pickBalancedTeams(enriched, threshold);
    if (picked) {
      await TeamAssignment.destroy({ where: { gameweekId, roomId } });
      await TeamAssignment.bulkCreate([
        ...picked.teamA.map((p) => ({
          playerId: p.id,
          gameweekId,
          team: 'A',
          roomId,
        })),
        ...picked.teamB.map((p) => ({
          playerId: p.id,
          gameweekId,
          team: 'B',
          roomId,
        })),
      ]);
    }

    // 4) Re‑count and return the new state
    const totalAvailable = await Availability.count({
      where: { gameweekId, status: true, roomId },
    });
    return res.json({
      available: totalAvailable,
      teams: picked
        ? {
          teamA: picked.teamA.map((p) => p.id),
          teamB: picked.teamB.map((p) => p.id),
        }
        : null,
    });
  } catch (error) {
    console.error('Error recording availability:', error);
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

    if (team === 'None') {
      // Remove the player from the team assignment
      await TeamAssignment.destroy({
        where: { gameweekId, playerId, roomId },
      });
      return res.status(200).json({ message: 'Player removed from team successfully' });
    } else {
      // Manually assign the player to the specified team
      await TeamAssignment.upsert({
        gameweekId,
        playerId,
        team,
        roomId,
      });
      return res.status(200).json({ message: 'Player assigned to team successfully' });
    }
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

    // 1) Load all current members of this room
    const memberships = await RoomMembership.findAll({
      where: { roomId, isMember: true },
      include: [{ model: Player, attributes: ['id', 'name', 'rating'] }]
    });

    // 2) Load any existing availability rows for that gameweek
    const availRows = await Availability.findAll({
      where: { gameweekId, roomId }
    });

    // 3) Merge: one entry per member, defaulting status=false
    const merged = memberships.map(m => {
      const rec = availRows.find(a => a.playerId === m.playerId);
      return {
        playerId: m.playerId,
        status: rec ? rec.status : false,
        Player: m.Player,      // so front‑end can show name, icon, etc.
        gameweekId
      };
    });

    return res.json(merged);
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

router.post("/gameweeks", protect, async (req, res) => {
  try {
    const { date, location, startTime, maxPlayers } = req.body;
    const { roomId } = req.user; // 🔹 Get roomId from logged-in user

    // Convert startTime to TIME format if it exists
    const formattedStartTime = startTime
      ? new Date(startTime).toISOString().slice(11, 19) // Extract HH:mm:ss
      : null;

    // ✅ Create the gameweek
    const gameweek = await Gameweek.create({
      date,
      location,
      startTime: formattedStartTime,
      maxPlayers: maxPlayers && maxPlayers % 2 === 0 ? maxPlayers : null,
      roomId,
    });

    // ✅ Send push notification to all players in the room
    const title = "📅 New Fixture Added!";
    const body = `A new game is scheduled on ${date} at ${location}. Tap to view.`;
    sendRoomNotification(roomId, title, body); // 🔹 Send the notification

    res.json(gameweek);
  } catch (error) {
    console.error("❌ Error creating gameweek:", error);
    res.status(500).json({ error: "Internal Server Error" });
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
      attributes: ['id', 'date', 'location', 'startTime', 'maxPlayers'], // Include location and startTime
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
          id: gameweek.id,
          date: gameweek.date,
          location: gameweek.location, // Include location
          startTime: gameweek.startTime, // Include start time
          playerOfTheMatch: playerOfTheMatch.length > 0 ? playerOfTheMatch : ['No votes'], // Return array or message
          votingCloseTime, // Dynamically calculated
          gameResult: gameResult ? gameResult.toJSON() : null, // Include existing game result
          maxPlayers: gameweek.maxPlayers ? gameweek.maxPlayers : null // Include maxPlayers
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

router.get('/sports', async (req, res) => {
  try {
    const sports = await Sport.findAll({ attributes: ['id', 'name', 'positions'] });
    res.json(sports);
  } catch (error) {
    console.error('Error fetching sports:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// GET /sports/:id - return one sport with positions
router.get('/sports/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const sport = await Sport.findByPk(id, {
      attributes: ['id', 'name', 'positions'],
    });

    if (!sport) {
      return res.status(404).json({ error: 'Sport not found' });
    }

    res.json(sport);
  } catch (error) {
    console.error('Error fetching sport:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



router.get('/has-voted', protect, async (req, res) => {
  const { gameweekId } = req.query;
  const { playerId, roomId } = req.user; // Use playerId from the middleware

  try {
    const vote = await Vote.findOne({
      where: {
        gameweek_id: gameweekId,
        voting_player_id: playerId, // Query using playerId
        roomId,
      },
    });

    if (vote) {
      return res.json({ hasVoted: true, player_id: playerId });
    } else {
      return res.json({ hasVoted: false, player_id: playerId });
    }
  } catch (error) {
    console.error('Error checking voting status:', error);
    res.status(500).json({ error: 'Error checking voting status' });
  }
});

router.get('/player-achievements', protect, async (req, res) => {
  try {
    const { playerId, roomId } = req.user;

    console.log('Fetching player achievements for:');
    console.log('Player ID:', playerId);
    console.log('Room ID:', roomId);

    if (!playerId || !roomId) {
      console.warn('Player or room information is missing');
      return res.status(400).json({ error: 'Player or room information is missing' });
    }

    // Fetch all achievements
    const allAchievements = await Achievement.findAll({
      attributes: ['id', 'title', 'description', 'isActive'],
    });

    // Fetch achievements linked to the player in the active room
    const playerAchievements = await PlayerAchievements.findAll({
      where: { playerId, roomId },
      attributes: ['achievementId', 'earnedAt'],
    });

    // Map player's achievements to a Set for quick lookup
    const earnedAchievementIds = new Set(playerAchievements.map((pa) => pa.achievementId));

    // Combine all achievements and mark as completed or not
    const response = allAchievements.map((achievement) => ({
      id: achievement.id,
      title: achievement.title,
      description: achievement.description,
      isCompleted: earnedAchievementIds.has(achievement.id),
      earnedAt: playerAchievements.find((pa) => pa.achievementId === achievement.id)?.earnedAt || null,
    }));

    console.log('Formatted response:', JSON.stringify(response, null, 2));
    res.json(response);
  } catch (error) {
    console.error('Error fetching player achievements:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});


router.post('/fcm-token', protect, async (req, res) => {
  const { fcmToken } = req.body;
  const auth0Id = req.user.sub;

  if (!fcmToken) {
    return res.status(400).json({ error: 'FCM token is required' });
  }

  try {
    const response = await saveFcmToken(auth0Id, fcmToken);
    if (response.error) {
      return res.status(400).json(response);
    }
    return res.json(response);
  } catch (error) {
    console.error('❌ Error saving FCM token:', error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});

router.put('/favorite-positions', protect, async (req, res) => {
  const { favoritePositions } = req.body;
  const { roomId, playerId } = req.user;

  if (!Array.isArray(favoritePositions) || favoritePositions.length > 3) {
    return res.status(400).json({ error: 'Must be an array with up to 3 positions.' });
  }

  try {
    const membership = await RoomMembership.findOne({
      where: { playerId, roomId, isActive: true },
    });

    if (!membership) {
      return res.status(404).json({ error: 'Membership not found' });
    }

    membership.favoritePositions = favoritePositions;
    await membership.save();

    return res.status(200).json({ message: 'Favorite positions updated successfully', favoritePositions });
  } catch (error) {
    console.error('Error updating favorite positions:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});



module.exports = router;
