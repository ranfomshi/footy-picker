const { PlayerAchievements, GameResult, TeamAssignment } = require('../models'); // Import required models
const sequelize = require('sequelize'); // Import sequelize if used for conditions
const { getTeammates } = require('./teamAssignmentHelpers'); // Adjust path if needed


const achievements = [
    {
        id: 1,
        condition: async ({ playerId, roomId, teamA_score, teamB_score }) => {
            // Team Streak: Win 3 games in a row.
            const recentWins = await PlayerAchievements.findAll({
                where: { playerId, roomId, achievementId: 1 },
                limit: 3,
                order: [['earnedAt', 'DESC']],
            });
            return (
                recentWins.length === 3 &&
                recentWins.every(
                    (win) =>
                        (win.team === 'A' && teamA_score > teamB_score) ||
                        (win.team === 'B' && teamB_score > teamA_score)
                )
            );
        },
    },
    {
        id: 2,
        condition: async ({ roomId }) => {
            // Draw Specialist: Play in 5 games that ended in a draw.
            const draws = await GameResult.count({
                where: {
                    roomId,
                    [sequelize.Op.and]: [
                        sequelize.literal('"teamA_score" = "teamB_score"'),
                    ],
                },
            });
            return draws >= 5;
        },
    },
    {
        id: 3,
        condition: async ({ playerId, roomId }) => {
            // Participation Badge: Participate in 10 games, regardless of results.
            const participationCount = await TeamAssignment.count({
                where: { playerId, roomId },
            });
            return participationCount >= 10;
        },
    },
    {
        id: 4,
        condition: async ({ roomId, playerId, assignment, teamA_score, teamB_score }) => {
            // Fetch the recent 5 games for the room
            const recentGames = await GameResult.findAll({
                where: { roomId },
                limit: 5,
                order: [['createdAt', 'DESC']],
                include: {
                    model: TeamAssignment,
                    where: { playerId, roomId }, // Ensure the player participated
                    attributes: ['team'],
                },
            });

            // If the player hasn't participated in at least 5 games, return false
            if (recentGames.length < 5) {
                return false;
            }

            // Check if the player's team remained undefeated in all games
            return recentGames.every((game) => {
                const playerTeam = game.TeamAssignments.find(
                    (assignment) => assignment.playerId === playerId
                )?.team;

                if (!playerTeam) {
                    return false;
                }

                return (
                    (playerTeam === 'A' && game.teamA_score >= game.teamB_score) ||
                    (playerTeam === 'B' && game.teamB_score >= game.teamA_score)
                );
            });
        },
    },

    {
        id: 5,
        condition: async ({ playerId, roomId, gameweekId, team }) => {
            if (!gameweekId || !team) {
                console.error('Missing gameweekId or team in achievement condition');
                return false;
            }

            const teammates = await getTeammates({ playerId, gameweekId, roomId, team });

            // Check if the teammates' games meet the condition
            return teammates.length >= 5;
        },
    },

    {
        id: 8,
        condition: async ({ playerId, roomId }) => {
            // Dedicated Player: Participate in 50 games.
            const participationCount = await TeamAssignment.count({
                where: { playerId, roomId },
            });
            return participationCount >= 50;
        },
    },
    {
        id: 9,
        condition: async ({ playerId, roomId }) => {
            // Century Club: Participate in 100 games.
            const participationCount = await TeamAssignment.count({
                where: { playerId, roomId },
            });
            return participationCount >= 100;
        },
    },
    {
        id: 10,
        condition: async ({ playerId, roomId }) => {
            // Champion: Win 10 games.
            const wins = await PlayerAchievements.count({
                where: { playerId, roomId, achievementId: 10 },
            });
            return wins >= 10;
        },
    },
    {
        id: 11,
        condition: async ({ assignment, teamA_score, teamB_score }) => {
            // Dominant Team: Win a game by a margin of 5 or more goals.
            return (
                (assignment.team === 'A' && teamA_score - teamB_score >= 5) ||
                (assignment.team === 'B' && teamB_score - teamA_score >= 5)
            );
        },
    },
    {
        id: 12,
        condition: async ({ playerId, roomId }) => {
            // Resilient: Participate in 5 games your team lost.
            const losses = await PlayerAchievements.count({
                where: { playerId, roomId, achievementId: 12 },
            });
            return losses >= 5;
        },
    },
    {
        id: 13,
        condition: async ({ assignment, teamA_score, teamB_score }) => {
            // Tough Loss: Participate in a game your team loses by a margin of 1 goal.
            return (
                (assignment.team === 'A' && teamB_score - teamA_score === 1) ||
                (assignment.team === 'B' && teamA_score - teamB_score === 1)
            );
        },
    },
    {
        id: 14,
        condition: async ({ roomId, assignment, teamA_score, teamB_score }) => {
            // Bounce Back: Win the next game after a loss.
            const lastGame = await GameResult.findOne({
                where: { roomId },
                order: [['createdAt', 'DESC']],
            });
            return (
                lastGame &&
                ((lastGame.teamA_score < lastGame.teamB_score && assignment.team === 'A') ||
                    (lastGame.teamB_score < lastGame.teamA_score && assignment.team === 'B')) &&
                ((assignment.team === 'A' && teamA_score > teamB_score) ||
                    (assignment.team === 'B' && teamB_score > teamA_score))
            );
        },
    },
    {
        id: 15,
        condition: async ({ assignment, teamA_score, teamB_score }) => {
            // High Scorer: Play in a game where your team scores 10 or more goals.
            return (
                (assignment.team === 'A' && teamA_score >= 10) ||
                (assignment.team === 'B' && teamB_score >= 10)
            );
        },
    },
    {
        id: 16,
        condition: async ({ assignment, teamA_score, teamB_score }) => {
            // Defensive Wall: Play in a game where your team concedes 0 goals.
            return (
                (assignment.team === 'A' && teamB_score === 0) ||
                (assignment.team === 'B' && teamA_score === 0)
            );
        },
    },
    {
        id: 17,
        condition: async ({ teamA_score, teamB_score }) => {
            // Goal Frenzy: Participate in a game where both teams score 5 or more goals.
            return teamA_score >= 5 && teamB_score >= 5;
        },
    },
];

module.exports = achievements;
