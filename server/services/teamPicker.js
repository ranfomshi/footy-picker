// teamPicker.js

const { Op } = require('sequelize');

function averageRating(players) {
    const sum = players.reduce((acc, p) => acc + p.rating, 0);
    return players.length ? sum / players.length : 0;
}

function isRatingBalanced(avgA, avgB, threshold = 0.1) {
    const max = Math.max(avgA, avgB);
    const min = Math.min(avgA, avgB);
    return (max - min) / max <= threshold;
}

function generateCombinations(players) {
    const half = Math.floor(players.length / 2);
    const result = [];

    function backtrack(start, teamA) {
        if (teamA.length === half) {
            const teamB = players.filter(p => !teamA.includes(p));
            result.push([teamA, teamB]);
            return;
        }
        for (let i = start; i < players.length; i++) {
            teamA.push(players[i]);
            backtrack(i + 1, teamA);
            teamA.pop();
        }
    }

    backtrack(0, []);
    return result;
}

function getPositionPreferenceScore(team, allPositions) {
    const positionCount = Object.fromEntries([...allPositions].map(pos => [pos, 0]));

    for (const player of team) {
        const prefs = player.favoritePositions || [];
        if (prefs.length > 0 && allPositions.has(prefs[0])) {
            positionCount[prefs[0]] += 3; // weight primary
            if (prefs[1]) positionCount[prefs[1]] += 2;
            if (prefs[2]) positionCount[prefs[2]] += 1;
        }
    }

    // Ideal is each team getting ~half per position
    const ideal = Object.fromEntries([...allPositions].map(pos => [pos, positionCount[pos] / 2]));

    // Recalculate actual distribution
    const teamScore = Object.values(positionCount).reduce((a, b) => a + b, 0);
    const deviation = Object.entries(positionCount).reduce((sum, [pos, count]) => {
        return sum + Math.abs(count - ideal[pos]);
    }, 0);

    return deviation / (teamScore || 1); // normalized deviation
}

async function pickBalancedTeams(players, threshold = 0.1) {
    // Get all distinct favorite positions across all players
    const allPositions = new Set();
    players.forEach(p => (p.favoritePositions || []).forEach(pos => allPositions.add(pos)));

    const combos = generateCombinations(players);

    let bestCombo = null;
    let bestScore = Infinity;

    for (const [teamA, teamB] of combos) {
        const avgA = averageRating(teamA);
        const avgB = averageRating(teamB);

        if (!isRatingBalanced(avgA, avgB, threshold)) continue;

        const score =
            getPositionPreferenceScore(teamA, allPositions) +
            getPositionPreferenceScore(teamB, allPositions);

        if (score < bestScore) {
            bestCombo = { teamA, teamB };
            bestScore = score;
        }
    }

    return bestCombo;
}

module.exports = { pickBalancedTeams };
