const { TeamAssignment, Player } = require('../models'); // Adjust the path as needed
const sequelize = require('sequelize');

const getTeammates = async ({ playerId, gameweekId, roomId, team }) => {
    if (!playerId || !gameweekId || !roomId || !team) {
        throw new Error(
            `Missing parameters in getTeammates: ${JSON.stringify({
                playerId,
                gameweekId,
                roomId,
                team,
            })}`
        );
    }

    return await TeamAssignment.findAll({
        where: {
            gameweekId,
            roomId,
            team,
            playerId: { [sequelize.Op.ne]: playerId }, // Exclude the current player
        },
        include: {
            model: Player,
            attributes: ['id', 'name', 'rating'],
        },
    });
};


module.exports = { getTeammates };
