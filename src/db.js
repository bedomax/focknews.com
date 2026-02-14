const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'news.db');

// Ensure data directory exists
const fs = require('fs');
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    published_at DATETIME,
    fetched_at DATETIME NOT NULL DEFAULT (datetime('now')),
    cluster_id INTEGER,
    score REAL DEFAULT 0
  )
`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_news_published_at ON news(published_at DESC);
  CREATE INDEX IF NOT EXISTS idx_news_source ON news(source);
  CREATE INDEX IF NOT EXISTS idx_news_cluster_id ON news(cluster_id);
  CREATE INDEX IF NOT EXISTS idx_news_score ON news(score DESC);
`);

// Migrate: add columns if they don't exist (safe for existing DBs)
try { db.exec('ALTER TABLE news ADD COLUMN cluster_id INTEGER'); } catch {}
try { db.exec('ALTER TABLE news ADD COLUMN score REAL DEFAULT 0'); } catch {}

const insertStmt = db.prepare(`
  INSERT OR IGNORE INTO news (title, url, source, published_at)
  VALUES (@title, @url, @source, @published_at)
`);

const insertMany = db.transaction((articles) => {
  let inserted = 0;
  for (const article of articles) {
    const result = insertStmt.run(article);
    if (result.changes > 0) inserted++;
  }
  return inserted;
});

function getNews({ source, limit = 200, offset = 0, sort = 'date' } = {}) {
  let query = 'SELECT * FROM news';
  const params = {};

  if (source) {
    query += ' WHERE source = @source';
    params.source = source;
  }

  if (sort === 'score') {
    query += ' ORDER BY score DESC, published_at DESC NULLS LAST';
  } else {
    query += ' ORDER BY published_at DESC NULLS LAST, fetched_at DESC';
  }

  query += ' LIMIT @limit OFFSET @offset';
  params.limit = limit;
  params.offset = offset;

  return db.prepare(query).all(params);
}

function getSources() {
  return db.prepare('SELECT DISTINCT source FROM news ORDER BY source').pluck().all();
}

function getCount({ source } = {}) {
  let query = 'SELECT COUNT(*) as count FROM news';
  const params = {};
  if (source) {
    query += ' WHERE source = @source';
    params.source = source;
  }
  return db.prepare(query).get(params).count;
}

function getAllRecent(hoursBack = 72) {
  return db.prepare(`
    SELECT id, title, source, published_at
    FROM news
    WHERE published_at > datetime('now', '-' || @hours || ' hours')
       OR published_at IS NULL
    ORDER BY published_at DESC NULLS LAST
  `).all({ hours: hoursBack });
}

const updateClusterStmt = db.prepare(
  'UPDATE news SET cluster_id = @cluster_id, score = @score WHERE id = @id'
);

const updateClusters = db.transaction((updates) => {
  for (const u of updates) {
    updateClusterStmt.run(u);
  }
});

function getClusterSources(clusterId) {
  return db.prepare(
    'SELECT DISTINCT source FROM news WHERE cluster_id = @cluster_id'
  ).pluck().all({ cluster_id: clusterId });
}

module.exports = {
  db, insertMany, getNews, getSources, getCount,
  getAllRecent, updateClusters, getClusterSources,
};
