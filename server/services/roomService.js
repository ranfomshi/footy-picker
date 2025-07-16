// services/roomService.js
const { Room, Player, RoomMembership, sequelize } = require('../models');
const { Op } = require('sequelize');

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
 * @param {string} params.auth0Id
 * @returns {Promise<{room: Room, membership: RoomMembership}>}
 */
async function completeRoomJoin({ roomCode, playerId, newPlayerName, auth0Id }) {
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

            await membership.update(
                { auth0Id, isActive: true },
                { transaction: t }
            );
        } else {
            // 2b) Create new player & membership
            const finalName = newPlayerName || 'Unnamed Player';

            // (Optional) fetch real user name from Auth0 in calling layer
            const newPlayer = await Player.create(
                { name: finalName },
                { transaction: t }
            );

            membership = await RoomMembership.create({
                playerId: newPlayer.id,
                roomId: room.id,
                auth0Id,
                isActive: true
            }, { transaction: t });
        }

        // 3) Deactivate any other memberships for this user
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
