// services/roomService.js
const { Room, Player, RoomMembership, sequelize } = require('../models');
const { Op } = require('sequelize');

// Import the Auth0 profile fetching function
const { getAuth0UserProfile } = require('../utils/auth0Utils');

/**
 * Fetch unlinked players in the given room.
 * @param {number} roomId
 * @returns {Promise<Array<Player>>}
 */
async function getUnlinkedPlayers(roomId) {
    return Player.findAll({
        include: {
            model: RoomMembership,
            where: { roomId, auth0Id: null }
        }
    });
}

/**
 * Complete the join-room flow: either link an existing player or create a new one.
 * @param {Object} params
 * @param {string} params.roomCode
 * @param {number|null} params.playerId
 * @param {string|null} params.newPlayerName
 * @param {string|null} params.skillLevel - 'beginner', 'below_average', 'average', 'better_than_average', 'experienced'
 * @param {string} params.auth0Id
 * @returns {Promise<{room: Room, membership: RoomMembership}>}
 */
async function completeRoomJoin({ roomCode, playerId, newPlayerName, skillLevel = 'average', auth0Id }) {
    return sequelize.transaction(async (t) => {
        // 1) Find the room
        const room = await Room.findOne({ where: { code: roomCode } }, { transaction: t });
        if (!room) throw new Error('Room not found');

        let membership;

        if (playerId) {
            // 2a) Link existing unlinked player
            membership = await RoomMembership.findOne({
                where: { roomId: room.id, playerId, auth0Id: null }
            }, { transaction: t });
            if (!membership) throw new Error('Invalid or already linked player');

            // Fetch Auth0 profile and update player with profile picture
            try {
                const auth0Profile = await getAuth0UserProfile(auth0Id);
                if (auth0Profile?.picture) {
                    await Player.update(
                        { profilePicture: auth0Profile.picture },
                        { where: { id: playerId }, transaction: t }
                    );
                }
            } catch (error) {
                console.log('Failed to fetch Auth0 profile for existing player:', error.message);
                // Continue without profile picture - not critical
            }

            await membership.update(
                { auth0Id, isActive: true },
                { transaction: t }
            );
        } else {
            // 2b) Create new player & membership with smart rating
            const finalName = newPlayerName || 'Unnamed Player';
            let profilePicture = null;

            // Fetch Auth0 profile for profile picture
            try {
                const auth0Profile = await getAuth0UserProfile(auth0Id);
                profilePicture = auth0Profile?.picture || null;
            } catch (error) {
                console.log('Failed to fetch Auth0 profile for new player:', error.message);
                // Continue without profile picture - not critical
            }

            // Calculate smart rating based on existing players in the room
            const existingPlayers = await Player.findAll({
                include: {
                    model: RoomMembership,
                    where: { roomId: room.id },
                },
                attributes: ['rating'],
            }, { transaction: t });

            let newPlayerRating = 1000; // Default fallback if no players exist

            if (existingPlayers.length > 0) {
                const ratings = existingPlayers.map(p => parseFloat(p.rating || 0));
                const meanRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
                const bestRating = Math.max(...ratings);
                const worstRating = Math.min(...ratings);

                // Calculate interpolated ratings
                const betterThanAvg = (meanRating + bestRating) / 2;
                const belowAvg = (meanRating + worstRating) / 2;

                // Assign rating based on skill level
                switch (skillLevel) {
                    case 'beginner':
                    case 'worst':
                        newPlayerRating = worstRating;
                        break;
                    case 'below_average':
                        newPlayerRating = belowAvg;
                        break;
                    case 'better_than_average':
                        newPlayerRating = betterThanAvg;
                        break;
                    case 'experienced':
                    case 'best':
                        newPlayerRating = bestRating;
                        break;
                    default: // 'average'
                        newPlayerRating = meanRating;
                }
            } else {
                // If no existing players, assign based on skill level with default scale
                switch (skillLevel) {
                    case 'beginner':
                        newPlayerRating = 800;
                        break;
                    case 'below_average':
                        newPlayerRating = 900;
                        break;
                    case 'better_than_average':
                        newPlayerRating = 1100;
                        break;
                    case 'experienced':
                        newPlayerRating = 1200;
                        break;
                    default: // 'average'
                        newPlayerRating = 1000;
                }
            }

            const newPlayer = await Player.create(
                {
                    name: finalName,
                    rating: newPlayerRating,
                    profilePicture
                },
                { transaction: t }
            );

            // Create initial rating entry
            const { Rating } = require('../models');
            await Rating.create({
                playerId: newPlayer.id,
                date: new Date(),
                rating: newPlayerRating,
                raterId: null,
                roomId: room.id,
            }, { transaction: t });

            membership = await RoomMembership.create({
                playerId: newPlayer.id,
                roomId: room.id,
                auth0Id,
                isActive: true
            }, { transaction: t });
        }        // 3) Deactivate any other memberships for this user
        await RoomMembership.update(
            { isActive: false },
            {
                where: {
                    auth0Id,
                    roomId: { [Op.ne]: room.id }
                },
                transaction: t
            }
        );

        return { room, membership };
    });
}

module.exports = {
    getUnlinkedPlayers,
    completeRoomJoin
};
