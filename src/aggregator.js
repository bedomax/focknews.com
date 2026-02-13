const { insertMany } = require('./db');
const { clusterAndScore } = require('./cluster');

// Register all sources here
const sources = [
  require('./sources/dw'),
  require('./sources/nbc'),
  require('./sources/mongabay'),
];

async function fetchAll() {
  const startTime = Date.now();
  console.log(`\n[${'='.repeat(50)}]`);
  console.log(`[Aggregator] Starting fetch at ${new Date().toISOString()}`);

  let totalInserted = 0;
  let totalParsed = 0;

  const results = await Promise.allSettled(
    sources.map((source) => source.fetch())
  );

  for (let i = 0; i < results.length; i++) {
    const sourceName = sources[i].SOURCE_NAME;
    const result = results[i];

    if (result.status === 'fulfilled') {
      const articles = result.value;
      totalParsed += articles.length;
      try {
        const inserted = insertMany(articles);
        totalInserted += inserted;
        console.log(`[${sourceName}] Inserted ${inserted} new articles (${articles.length} total parsed)`);
      } catch (err) {
        console.error(`[${sourceName}] DB insert error: ${err.message}`);
      }
    } else {
      console.error(`[${sourceName}] Fetch failed: ${result.reason?.message || result.reason}`);
    }
  }

  // Run clustering after inserting new articles
  const clusterResult = clusterAndScore();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Aggregator] Done in ${elapsed}s — ${totalInserted} new articles inserted (${totalParsed} parsed)`);
  console.log(`[${'='.repeat(50)}]\n`);

  return { totalInserted, totalParsed, ...clusterResult };
}

module.exports = { fetchAll, sources };
