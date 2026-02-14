const { fetchAll } = require('../../src/aggregator');

module.exports = async function handler(req, res) {
  // Verify this is called by Vercel Cron (or allow in dev)
  const authHeader = req.headers['authorization'];
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const result = await fetchAll();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error('Cron fetch error:', err);
    res.status(500).json({ ok: false, error: err.message });
  }
};
