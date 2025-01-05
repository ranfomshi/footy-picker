const achievements = [
    {
        id: 1,
        condition: async () => {
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
        condition: async () => {
            // Draw Specialist: Play in 5 games that ended in a draw.
            const draws = await GameResult.count({
                where: { roomId, teamA_score: sequelize.col('teamB_score') },
            });
            return draws >= 5;
        },
    },
    {
        id: 3,
        condition: async () => {
            // Participation Badge: Participate in 10 games, regardless of results.
            const participationCount = await TeamAssignment.count({
                where: { playerId, roomId },
            });
            return participationCount >= 10;
        },
    },
    {
        id: 4,
        condition: async () => {
            // Undefeated Run: Play on a team that remains undefeated for 5 consecutive games.
            const recentGames = await GameResult.findAll({
                where: { roomId },
                limit: 5,
                order: [['createdAt', 'DESC']],
            });
            return recentGames.every(
                (game) =>
                    (assignment.team === 'A' && teamA_score >= teamB_score) ||
                    (assignment.team === 'B' && teamB_score >= teamA_score)
            );
        },
    },
    {
        id: 5,
        condition: async () => {
            // Long-time Teammates: Play 5 games in a row with the same teammate.
            const teammateGames = await TeamAssignment.findAll({
                where: { playerId, roomId },
                limit: 5,
                include: [{ model: TeamAssignment, as: 'teammates' }],
                order: [['createdAt', 'DESC']],
            });
            return teammateGames.every(
                (game) => game.teammates.length > 0 && game.teammates.every((t) => t.id === playerId)
            );
        },
    },
    {
        id: 8,
        condition: async () => {
            // Dedicated Player: Participate in 50 games.
            const participationCount = await TeamAssignment.count({
                where: { playerId, roomId },
            });
            return participationCount >= 50;
        },
    },
    {
        id: 9,
        condition: async () => {
            // Century Club: Participate in 100 games.
            const participationCount = await TeamAssignment.count({
                where: { playerId, roomId },
            });
            return participationCount >= 100;
        },
    },
    {
        id: 10,
        condition: async () => {
            // Champion: Win 10 games.
            const wins = await PlayerAchievements.count({
                where: { playerId, roomId, achievementId: 10 },
            });
            return wins >= 10;
        },
    },
    {
        id: 11,
        condition: async () => {
            // Dominant Team: Win a game by a margin of 5 or more goals.
            return (
                (assignment.team === 'A' && teamA_score - teamB_score >= 5) ||
                (assignment.team === 'B' && teamB_score - teamA_score >= 5)
            );
        },
    },
    {
        id: 12,
        condition: async () => {
            // Resilient: Participate in 5 games your team lost.
            const losses = await PlayerAchievements.count({
                where: { playerId, roomId, achievementId: 12 },
            });
            return losses >= 5;
        },
    },
    {
        id: 13,
        condition: async () => {
            // Tough Loss: Participate in a game your team loses by a margin of 1 goal.
            return (
                (assignment.team === 'A' && teamB_score - teamA_score === 1) ||
                (assignment.team === 'B' && teamA_score - teamB_score === 1)
            );
        },
    },
    {
        id: 14,
        condition: async () => {
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
        condition: async () => {
            // High Scorer: Play in a game where your team scores 10 or more goals.
            return (
                (assignment.team === 'A' && teamA_score >= 10) ||
                (assignment.team === 'B' && teamB_score >= 10)
            );
        },
    },
    {
        id: 16,
        condition: async () => {
            // Defensive Wall: Play in a game where your team concedes 0 goals.
            return (
                (assignment.team === 'A' && teamB_score === 0) ||
                (assignment.team === 'B' && teamA_score === 0)
            );
        },
    },
    {
        id: 17,
        condition: async () => {
            // Goal Frenzy: Participate in a game where both teams score 5 or more goals.
            return teamA_score >= 5 && teamB_score >= 5;
        },
    },
];

export default achievements;
