const { insertMany } = require('./db');
const { clusterAndScore } = require('./cluster');

// Register all sources here, grouped by country
const allSources = [
  // Chile
  require('./sources/cl/biobiochile'),
  require('./sources/cl/cooperativa'),
  require('./sources/cl/latercera'),
  require('./sources/cl/ciper'),
  require('./sources/cl/theclinic'),
  require('./sources/cl/interferencia'),
  require('./sources/cl/eldesconcierto'),
  // Ecuador
  require('./sources/ec/elcomercio'),
  require('./sources/ec/eluniverso'),
  require('./sources/ec/metroecuador'),
  require('./sources/ec/gk'),
  require('./sources/ec/labarraespaciadora'),
  require('./sources/ec/planv'),
  require('./sources/ec/confirmado'),
];

function getSourcesByCountry(country) {
  return allSources.filter(s => s.COUNTRY === country);
}

async function fetchAll() {
  const startTime = Date.now();
  console.log(`\n[${'='.repeat(50)}]`);
  console.log(`[Aggregator] Starting fetch at ${new Date().toISOString()}`);

  let totalInserted = 0;
  let totalParsed = 0;

  const results = await Promise.allSettled(
    allSources.map((source) => source.fetch())
  );

  for (let i = 0; i < results.length; i++) {
    const sourceName = allSources[i].SOURCE_NAME;
    const country = allSources[i].COUNTRY;
    const result = results[i];

    if (result.status === 'fulfilled') {
      const articles = result.value.map(a => ({ ...a, country }));
      totalParsed += articles.length;
      try {
        const inserted = await insertMany(articles);
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
  const clusterResult = await clusterAndScore();

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[Aggregator] Done in ${elapsed}s — ${totalInserted} new articles inserted (${totalParsed} parsed)`);
  console.log(`[${'='.repeat(50)}]\n`);

  return { totalInserted, totalParsed, ...clusterResult };
}

module.exports = { fetchAll, allSources, getSourcesByCountry };
