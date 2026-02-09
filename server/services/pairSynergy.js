const { Op } = require('sequelize');
const { GameResult, TeamAssignment } = require('../models');

const DEFAULT_LOOKBACK_GAMES = 40;
const DEFAULT_SMOOTHING = 3;

function buildPairKey(a, b) {
  const first = Number(a);
  const second = Number(b);
  return first < second ? `${first}:${second}` : `${second}:${first}`;
}

function getTeamOutcomeScore(result, team) {
  if (result.teamA_score === result.teamB_score) return 0;
  const teamAWin = result.teamA_score > result.teamB_score;
  if (team === 'A') return teamAWin ? 1 : -1;
  return teamAWin ? -1 : 1;
}

async function buildPairSynergyMap({
  roomId,
  playerIds = [],
  lookbackGames = DEFAULT_LOOKBACK_GAMES,
  smoothing = DEFAULT_SMOOTHING,
}) {
  if (!roomId) return {};

  const targetPlayerIds = new Set((playerIds || []).map((id) => Number(id)));

  const recentResults = await GameResult.findAll({
    where: { roomId },
    attributes: ['gameweekId', 'teamA_score', 'teamB_score', 'createdAt'],
    order: [['createdAt', 'DESC']],
    limit: lookbackGames,
    raw: true,
  });

  if (!recentResults.length) return {};

  const resultByGameweekId = new Map(
    recentResults.map((row) => [Number(row.gameweekId), row])
  );

  const gameweekIds = [...resultByGameweekId.keys()];
  const assignments = await TeamAssignment.findAll({
    where: {
      roomId,
      gameweekId: { [Op.in]: gameweekIds },
    },
    attributes: ['gameweekId', 'team', 'playerId'],
    raw: true,
  });

  const assignmentsByGameweekTeam = new Map();
  for (const row of assignments) {
    const playerId = Number(row.playerId);
    if (targetPlayerIds.size && !targetPlayerIds.has(playerId)) continue;

    const key = `${Number(row.gameweekId)}:${row.team}`;
    const existing = assignmentsByGameweekTeam.get(key) || [];
    existing.push(playerId);
    assignmentsByGameweekTeam.set(key, existing);
  }

  const pairStats = new Map();

  for (const [groupKey, playerList] of assignmentsByGameweekTeam.entries()) {
    if (playerList.length < 2) continue;

    const [gameweekIdRaw, team] = groupKey.split(':');
    const gameweekId = Number(gameweekIdRaw);
    const result = resultByGameweekId.get(gameweekId);
    if (!result) continue;

    const outcomeScore = getTeamOutcomeScore(result, team);
    const sortedPlayers = [...playerList].sort((a, b) => a - b);

    for (let i = 0; i < sortedPlayers.length; i++) {
      for (let j = i + 1; j < sortedPlayers.length; j++) {
        const pairKey = buildPairKey(sortedPlayers[i], sortedPlayers[j]);
        const stat = pairStats.get(pairKey) || { score: 0, games: 0 };
        stat.games += 1;
        stat.score += outcomeScore;
        pairStats.set(pairKey, stat);
      }
    }
  }

  const pairSynergyMap = {};
  for (const [pairKey, stat] of pairStats.entries()) {
    const meanOutcome = stat.games > 0 ? stat.score / stat.games : 0;
    const confidence = stat.games / (stat.games + smoothing);
    pairSynergyMap[pairKey] = meanOutcome * confidence;
  }

  return pairSynergyMap;
}

module.exports = {
  buildPairKey,
  buildPairSynergyMap,
};
