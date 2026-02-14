const express = require('express');
const path = require('path');
const { getNews, getCount } = require('./db');
const { fetchAll } = require('./aggregator');
const { extractTags, getArticleIdsByTag } = require('./tags');

const app = express();
const PORT = process.env.PORT || 3000;
const FETCH_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

const VALID_COUNTRIES = ['cl', 'ec'];

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API: Detect country from IP using free geoip service
app.get('/api/geo', async (req, res) => {
  try {
    // Get client IP (support proxies)
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim()
      || req.socket.remoteAddress;

    // For localhost/dev, default to 'cl'
    if (!ip || ip === '127.0.0.1' || ip === '::1' || ip.startsWith('192.168')) {
      return res.json({ country: 'cl' });
    }

    const response = await fetch(`https://ipapi.co/${ip}/country_code/`);
    const code = (await response.text()).trim().toLowerCase();

    if (VALID_COUNTRIES.includes(code)) {
      return res.json({ country: code });
    }
    // Default to Chile for unsupported countries
    res.json({ country: 'cl' });
  } catch {
    res.json({ country: 'cl' });
  }
});

// API: Get news articles (country-filtered)
app.get('/api/news', (req, res) => {
  const { source, tag, limit, offset, sort, country } = req.query;

  // Validate country, default to 'cl'
  const cc = VALID_COUNTRIES.includes(country) ? country : 'cl';

  let ids;
  if (tag) {
    ids = getArticleIdsByTag(tag, cc);
    if (ids.length === 0) {
      return res.json({ articles: [], tags: extractTags(72, 15, cc), count: 0, country: cc });
    }
  }

  const articles = getNews({
    source: source || undefined,
    country: cc,
    ids,
    limit: limit ? parseInt(limit, 10) : 15,
    offset: offset ? parseInt(offset, 10) : 0,
    sort: sort === 'score' ? 'score' : 'date',
  });
  const tags = extractTags(72, 15, cc);
  const count = tag ? ids.length : getCount({ source: source || undefined, country: cc });

  res.json({ articles, tags, count, country: cc });
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
  console.log(`tagadata.com running at http://localhost:${PORT}`);

  // Initial fetch on startup
  console.log('Running initial fetch...');
  await fetchAll();

  // Schedule recurring fetch every 10 minutes
  setInterval(() => {
    fetchAll().catch((err) => console.error('Scheduled fetch error:', err));
  }, FETCH_INTERVAL_MS);
});
