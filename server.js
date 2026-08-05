import express from 'express';
import compression from 'compression';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabases, searchDict, reverseSearchDict } from './db.js';
import { getStats, recordVisit, recordSearch } from './stats.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 72;

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

console.log('Loading dictionaries...');
await initDatabases();
console.log('All dictionaries loaded. ✓');

app.get('/api/stats', (req, res) => {
  res.json(getStats());
});

app.post('/api/stats/visit', (req, res) => {
  res.json(recordVisit());
});

app.post('/api/stats/search', (req, res) => {
  res.json(recordSearch());
});

app.post('/api/dict', (req, res) => {
  try {
    const word = req.body.word || req.body.query || req.body.term || '';
    const limit = req.body.limit || 200;
    const dicts = req.body.dicts || null;
    if (!word) return res.status(400).json({ error: 'word is required' });
    recordSearch();
    const results = searchDict(word, limit, dicts);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reverse', (req, res) => {
  try {
    const term = req.body.term || req.body.query || req.body.term || '';
    const limit = req.body.limit || 200;
    const dicts = req.body.dicts || null;
    if (!term) return res.status(400).json({ error: 'term is required' });
    recordSearch();
    const results = reverseSearchDict(term, limit, dicts);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Fallback: serve index.html for any unmatched routes
app.get('{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
