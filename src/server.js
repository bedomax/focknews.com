const express = require('express');
const path = require('path');
const { getNews, getSources, getCount } = require('./db');
const { fetchAll } = require('./aggregator');

const app = express();
const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: Get news articles
app.get('/api/news', (req, res) => {
  const { source, limit, offset, sort } = req.query;
  const articles = getNews({
    source: source || undefined,
    limit: limit ? parseInt(limit, 10) : 200,
    offset: offset ? parseInt(offset, 10) : 0,
    sort: sort === 'score' ? 'score' : 'date',
  });
  const sources = getSources();
  const count = getCount({ source: source || undefined });

  res.json({ articles, sources, count });
});

// API: Trigger manual fetch
app.post('/api/fetch', async (req, res) => {
  try {
    const result = await fetchAll();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message });
  }
});

// Serve the board at root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, async () => {
  console.log(`focknews.com running at http://localhost:${PORT}`);

  // Initial fetch on startup
  console.log('Running initial fetch...');
  await fetchAll();

  // Schedule recurring fetch every 10 minutes
  setInterval(() => {
    fetchAll().catch((err) => console.error('Scheduled fetch error:', err));
  }, FETCH_INTERVAL_MS);
});
