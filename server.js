import express from 'express';
import compression from 'compression';
import cors from 'cors';
import { initDatabases, searchDict, reverseSearchDict } from './db.js';

const app = express();
const PORT = process.env.PORT || 72;

app.use(cors());
app.use(compression());
app.use(express.json());
app.use(express.static('public'));

console.log('Loading dictionaries...');
await initDatabases();
console.log('All dictionaries loaded. ✓');

app.post('/api/dict', (req, res) => {
  try {
    const word = req.body.word || req.body.query || req.body.term || '';
    const limit = req.body.limit || 200;
    if (!word) return res.status(400).json({ error: 'word is required' });
    const results = searchDict(word, limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reverse', (req, res) => {
  try {
    const term = req.body.term || req.body.query || req.body.word || '';
    const limit = req.body.limit || 200;
    if (!term) return res.status(400).json({ error: 'term is required' });
    const results = reverseSearchDict(term, limit);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
