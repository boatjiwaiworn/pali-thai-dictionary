import fs from 'fs';
import path from 'path';

const STATS_FILE = path.join(process.cwd(), 'data', 'db', 'stats.json');

function getTodayKey() {
  const now = new Date();
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Bangkok',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(now);
}

function loadStats() {
  try {
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    if (fs.existsSync(STATS_FILE)) {
      return JSON.parse(fs.readFileSync(STATS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading stats.json:', e.message);
  }
  return {
    totalVisits: 0,
    dailyVisits: {},
    totalSearches: 0,
    dailySearches: {}
  };
}

function saveStats(data) {
  try {
    const dir = path.dirname(STATS_FILE);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(STATS_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving stats.json:', e.message);
  }
}

let cache = loadStats();

export function recordVisit() {
  const today = getTodayKey();
  cache.totalVisits = (cache.totalVisits || 0) + 1;
  if (!cache.dailyVisits) cache.dailyVisits = {};
  cache.dailyVisits[today] = (cache.dailyVisits[today] || 0) + 1;
  saveStats(cache);
  return getStats();
}

export function recordSearch() {
  const today = getTodayKey();
  cache.totalSearches = (cache.totalSearches || 0) + 1;
  if (!cache.dailySearches) cache.dailySearches = {};
  cache.dailySearches[today] = (cache.dailySearches[today] || 0) + 1;
  saveStats(cache);
  return getStats();
}

export function getStats() {
  const today = getTodayKey();
  return {
    totalVisits: cache.totalVisits || 0,
    todayVisits: (cache.dailyVisits && cache.dailyVisits[today]) || 0,
    totalSearches: cache.totalSearches || 0,
    todaySearches: (cache.dailySearches && cache.dailySearches[today]) || 0
  };
}
