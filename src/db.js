const { sql } = require('@vercel/postgres');

let initialized = false;

async function ensureSchema() {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS news (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      url TEXT NOT NULL UNIQUE,
      source TEXT NOT NULL,
      country TEXT NOT NULL DEFAULT 'cl',
      published_at TIMESTAMPTZ,
      fetched_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      cluster_id INTEGER,
      score REAL DEFAULT 0
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_source ON news(source)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_cluster_id ON news(cluster_id)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_score ON news(score DESC)`;
  await sql`CREATE INDEX IF NOT EXISTS idx_news_country ON news(country)`;
  initialized = true;
}

async function insertMany(articles) {
  await ensureSchema();
  let inserted = 0;
  for (const a of articles) {
    const result = await sql`
      INSERT INTO news (title, url, source, country, published_at)
      VALUES (${a.title}, ${a.url}, ${a.source}, ${a.country}, ${a.published_at})
      ON CONFLICT (url) DO NOTHING
    `;
    if (result.rowCount > 0) inserted++;
  }
  return inserted;
}

async function getNews({ source, country, ids, limit = 200, offset = 0, sort = 'date' } = {}) {
  await ensureSchema();

  const conditions = [];
  const params = [];
  let idx = 1;

  if (country) {
    conditions.push(`country = $${idx++}`);
    params.push(country);
  }
  if (source) {
    conditions.push(`source = $${idx++}`);
    params.push(source);
  }
  if (ids && ids.length > 0) {
    const placeholders = ids.map((_, i) => `$${idx + i}`).join(',');
    conditions.push(`id IN (${placeholders})`);
    params.push(...ids);
    idx += ids.length;
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const orderBy = sort === 'score'
    ? 'ORDER BY score DESC, published_at DESC NULLS LAST'
    : 'ORDER BY published_at DESC NULLS LAST, fetched_at DESC';

  params.push(limit, offset);
  const query = `SELECT * FROM news ${where} ${orderBy} LIMIT $${idx++} OFFSET $${idx}`;

  const { rows } = await sql.query(query, params);
  return rows;
}

async function getCount({ source, country } = {}) {
  await ensureSchema();

  const conditions = [];
  const params = [];
  let idx = 1;

  if (country) {
    conditions.push(`country = $${idx++}`);
    params.push(country);
  }
  if (source) {
    conditions.push(`source = $${idx++}`);
    params.push(source);
  }

  const where = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
  const { rows } = await sql.query(`SELECT COUNT(*) as count FROM news ${where}`, params);
  return parseInt(rows[0].count, 10);
}

async function getAllRecent(hoursBack = 72, country = null) {
  await ensureSchema();

  const interval = `${hoursBack} hours`;
  if (country) {
    const { rows } = await sql`
      SELECT id, title, source, country, published_at
      FROM news
      WHERE (published_at > NOW() - CAST(${interval} AS INTERVAL)
         OR published_at IS NULL)
        AND country = ${country}
      ORDER BY published_at DESC NULLS LAST
    `;
    return rows;
  }

  const { rows } = await sql`
    SELECT id, title, source, country, published_at
    FROM news
    WHERE published_at > NOW() - CAST(${interval} AS INTERVAL)
       OR published_at IS NULL
    ORDER BY published_at DESC NULLS LAST
  `;
  return rows;
}

async function updateClusters(updates) {
  await ensureSchema();
  for (const u of updates) {
    await sql`
      UPDATE news SET cluster_id = ${u.cluster_id}, score = ${u.score} WHERE id = ${u.id}
    `;
  }
}

async function getClusterSources(clusterId) {
  await ensureSchema();
  const { rows } = await sql`
    SELECT DISTINCT source FROM news WHERE cluster_id = ${clusterId}
  `;
  return rows.map(r => r.source);
}

module.exports = {
  insertMany, getNews, getCount,
  getAllRecent, updateClusters, getClusterSources, ensureSchema,
};
