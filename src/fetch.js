// Manual fetch script — run with: npm run fetch
const { fetchAll } = require('./aggregator');

fetchAll()
  .then(({ totalInserted, totalParsed }) => {
    console.log(`Finished. ${totalInserted} new / ${totalParsed} parsed.`);
    process.exit(0);
  })
  .catch((err) => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
