/**
 * Spordle Play API client for PCAHA stats.
 */

const config = require('./config.json');

const BASE_URL = config.baseUrl;
const HEADERS = {
  'Authorization': config.apiKey,
  'Accept': 'application/json',
};

// Rate limiting: max 5 concurrent requests, 100ms between batches
const CONCURRENCY = 5;
const DELAY_MS = 100;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchApi(endpoint) {
  const url = `${BASE_URL}${endpoint}`;
  const response = await fetch(url, { headers: HEADERS });
  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`API ${response.status}: ${response.statusText} for ${endpoint}`);
  }
  return response.json();
}

/**
 * Fetch with retry and rate limiting
 */
async function fetchWithRetry(endpoint, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchApi(endpoint);
    } catch (e) {
      if (i === retries - 1) throw e;
      console.log(`  Retry ${i + 1} for ${endpoint}: ${e.message}`);
      await sleep(1000 * (i + 1));
    }
  }
}

/**
 * Process items in batches with concurrency limit
 */
async function batchProcess(items, fn, concurrency = CONCURRENCY) {
  const results = [];
  for (let i = 0; i < items.length; i += concurrency) {
    const batch = items.slice(i, i + concurrency);
    const batchResults = await Promise.all(batch.map(fn));
    results.push(...batchResults);
    if (i + concurrency < items.length) {
      await sleep(DELAY_MS);
    }
  }
  return results;
}

// ==================== API METHODS ====================

/**
 * Get all divisions (U4-U18, etc.)
 */
async function getDivisions() {
  return fetchWithRetry('/divisions?filter={"order":"order"}');
}

/**
 * Get PCAHA office info
 */
async function getOffice() {
  return fetchWithRetry(`/offices/${config.officeId}`);
}

/**
 * Get all leagues/groups for PCAHA
 */
async function getLeagues() {
  return fetchWithRetry(`/groups?filter={"where":{"officeId":${config.officeId},"type":"League"}}`);
}

/**
 * Get all schedules for a specific season and division
 */
async function getSchedules(seasonId, divisionId) {
  const filter = JSON.stringify({
    where: { seasonId, 'category.divisionId': divisionId },
    order: ['startDate ASC', 'category.order ASC', 'name ASC'],
    include: 'category'
  });
  return fetchWithRetry(`/schedules?filter=${encodeURIComponent(filter)}`);
}

/**
 * Get team standings for a specific schedule
 */
async function getTeamStats(scheduleId) {
  const filter = JSON.stringify({
    include: ['team', 'group'],
    order: ['group.name ASC', 'ranking ASC']
  });
  return fetchWithRetry(`/schedules/${scheduleId}/teamStats?filter=${encodeURIComponent(filter)}`);
}

/**
 * Get all games for a schedule
 */
async function getGames(scheduleId) {
  const filter = JSON.stringify({
    where: { scheduleId },
    order: 'date DESC',
    include: ['homeTeam', 'awayTeam']
  });
  return fetchWithRetry(`/games?filter=${encodeURIComponent(filter)}`);
}

/**
 * Get boxscore for a game (goals + penalties + player names)
 */
async function getBoxscore(gameId) {
  return fetchWithRetry(`/games/${gameId}/boxscore`);
}

/**
 * Get groups (flights) for a schedule
 */
async function getGroups(scheduleId) {
  const filter = JSON.stringify({
    where: { scheduleId }
  });
  return fetchWithRetry(`/schedules/${scheduleId}/groups`);
}

/**
 * Get participant info
 */
async function getParticipant(participantId) {
  return fetchWithRetry(`/participants/${participantId}`);
}

/**
 * Get team roster (all registered players/staff)
 */
async function getTeamMembers(teamId) {
  const filter = JSON.stringify({
    include: 'participant'
  });
  return fetchWithRetry(`/teams/${teamId}/members?filter=${encodeURIComponent(filter)}`);
}

module.exports = {
  fetchApi,
  fetchWithRetry,
  batchProcess,
  getDivisions,
  getOffice,
  getLeagues,
  getSchedules,
  getTeamStats,
  getGames,
  getBoxscore,
  getGroups,
  getParticipant,
  getTeamMembers,
  sleep,
};
