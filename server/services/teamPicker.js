// teamPicker.js

// 1) Calculate average rating of an array of players
function averageRating(players) {
    const sum = players.reduce((acc, p) => acc + (p.rating || 0), 0);
    return players.length ? sum / players.length : 0;
}

// 2) Check if two average ratings are balanced within a threshold
function isRatingBalanced(avgA, avgB, threshold = 0.1) {
    const max = Math.max(avgA, avgB);
    const min = Math.min(avgA, avgB);
    return max === 0 ? true : (max - min) / max <= threshold;
}

// 3) Generate all possible ways to split players into two teams
function generateCombinations(players) {
    const result = [];
    const total = players.length;
    // For an even number of players, teams are half and half.
    // For an odd number, teams can be floor(n/2) and ceil(n/2).
    const half = Math.floor(total / 2);
    const upperHalf = Math.ceil(total / 2);

    function backtrack(start, teamA) {
        // Stop condition: if teamA has half or upperHalf players, form teamB from the remainder.
        if (teamA.length === half || teamA.length === upperHalf) {
            const teamB = players.filter(p => !teamA.includes(p));
            result.push([teamA.slice(), teamB]);
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

// 4) Compute a "position preference" score for a team;
//    lower is better (less deviation from a balanced distribution of favorite positions).
function getPositionPreferenceScore(team, allPositions) {
    // Initialize counts of each position to 0
    const positionCount = Object.fromEntries([...allPositions].map(pos => [pos, 0]));

    for (const player of team) {
        const prefs = player.favoritePositions || [];
        // Weighted scoring: first favorite +3, second +2, third +1
        if (prefs[0] && allPositions.has(prefs[0])) positionCount[prefs[0]] += 3;
        if (prefs[1] && allPositions.has(prefs[1])) positionCount[prefs[1]] += 2;
        if (prefs[2] && allPositions.has(prefs[2])) positionCount[prefs[2]] += 1;
    }

    // Sum all scores for normalizing
    const teamScore = Object.values(positionCount).reduce((acc, val) => acc + val, 0);
    if (teamScore === 0) return 0; // If no positions were scored, no deviation.

    // We'll measure deviation from a "perfectly balanced" distribution within the team
    const idealCount = teamScore / allPositions.size;
    let deviationSum = 0;

    for (const pos of Object.keys(positionCount)) {
        deviationSum += Math.abs(positionCount[pos] - idealCount);
    }

    // Final score: average deviation per position
    return deviationSum / allPositions.size;
}

function getRatingGapRatio(teamA, teamB) {
    const avgA = averageRating(teamA);
    const avgB = averageRating(teamB);
    const max = Math.max(avgA, avgB);
    const min = Math.min(avgA, avgB);
    return max === 0 ? 0 : (max - min) / max;
}

function buildPairKey(a, b) {
    const first = Number(a);
    const second = Number(b);
    return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function getTeamPairSynergyScore(team, pairSynergyMap) {
    if (!team || team.length < 2) return 0;

    let total = 0;
    let pairCount = 0;

    for (let i = 0; i < team.length; i++) {
        for (let j = i + 1; j < team.length; j++) {
            const key = buildPairKey(team[i].id, team[j].id);
            total += Number(pairSynergyMap[key] || 0);
            pairCount += 1;
        }
    }

    return pairCount === 0 ? 0 : total / pairCount;
}

function isBetterCandidate(ratingGap, adjustedScore, bestRatingGap, bestAdjustedScore, ratingGapEpsilon) {
    if (ratingGap < bestRatingGap - ratingGapEpsilon) return true;

    if (Math.abs(ratingGap - bestRatingGap) <= ratingGapEpsilon && adjustedScore < bestAdjustedScore) {
        return true;
    }

    return false;
}

/**
 * Attempts to form two balanced teams from `players` within a given rating threshold.
 * Steps:
 *   1) Handle trivial cases (0 or 1 player).
 *   2) Generate all team splits (combinations).
 *   3) Score by rating closeness first, then position preferences + pair synergy.
 *   4) Prefer teams within threshold, but always return the best overall split.
 * Returns an object { teamA, teamB } or null if absolutely nothing can be formed.
 */
async function pickBalancedTeams(players, threshold = 0.1, options = {}) {
    // Handle 0 players -> both teams empty
    if (players.length === 0) {
        return { teamA: [], teamB: [] };
    }

    // Handle exactly 1 player -> all on Team A
    if (players.length === 1) {
        return { teamA: [players[0]], teamB: [] };
    }

    // Gather all unique favorite positions
    const allPositions = new Set();
    players.forEach(p => (p.favoritePositions || []).forEach(pos => allPositions.add(pos)));

    // Generate every possible team split
    const combos = generateCombinations(players);

    const pairSynergyMap = options.pairSynergyMap || {};
    const pairSynergyWeight = Number.isFinite(options.pairSynergyWeight) ? options.pairSynergyWeight : 0.75;
    const ratingGapEpsilon = Number.isFinite(options.ratingGapEpsilon) ? options.ratingGapEpsilon : 0.015;

    // Track best split inside threshold and best split overall.
    let bestWithinThreshold = null;
    let bestWithinRatingGap = Infinity;
    let bestWithinAdjustedScore = Infinity;

    let bestOverall = null;
    let bestOverallRatingGap = Infinity;
    let bestOverallAdjustedScore = Infinity;

    // Adjust threshold if the teams are of unequal size
    const isUneven = (players.length % 2 !== 0);
    const adjustedThreshold = isUneven ? threshold * 1.5 : threshold;

    for (const [teamA, teamB] of combos) {
        const ratingGap = getRatingGapRatio(teamA, teamB);

        // Calculate position preference score and pair synergy contribution.
        const positionScore =
            getPositionPreferenceScore(teamA, allPositions) +
            getPositionPreferenceScore(teamB, allPositions);
        const pairSynergyScore =
            getTeamPairSynergyScore(teamA, pairSynergyMap) +
            getTeamPairSynergyScore(teamB, pairSynergyMap);

        const adjustedScore = positionScore - (pairSynergyWeight * pairSynergyScore);

        const isWithinThreshold = isRatingBalanced(
            averageRating(teamA),
            averageRating(teamB),
            adjustedThreshold
        );

        // Best overall: prioritize rating gap, then adjusted objective (position + synergy).
        if (isBetterCandidate(ratingGap, adjustedScore, bestOverallRatingGap, bestOverallAdjustedScore, ratingGapEpsilon)) {
            bestOverall = { teamA, teamB };
            bestOverallRatingGap = ratingGap;
            bestOverallAdjustedScore = adjustedScore;
        }

        // Best within threshold uses same ranking.
        if (
            isWithinThreshold &&
            isBetterCandidate(ratingGap, adjustedScore, bestWithinRatingGap, bestWithinAdjustedScore, ratingGapEpsilon)
        ) {
            bestWithinThreshold = { teamA, teamB };
            bestWithinRatingGap = ratingGap;
            bestWithinAdjustedScore = adjustedScore;
        }
    }

    // Prefer a threshold-valid split, otherwise return the closest split overall.
    if (bestWithinThreshold) {
        return bestWithinThreshold;
    }

    return bestOverall;
}

module.exports = { pickBalancedTeams };

