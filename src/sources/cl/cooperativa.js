const Parser = require('rss-parser');
const { normalizeUrl } = require('../../utils');

const parser = new Parser();
const FEED_URL = 'https://www.cooperativa.cl/noticias/site/tax/port/all/rss____1.xml';
const SOURCE_NAME = 'Cooperativa';
const COUNTRY = 'cl';

async function fetch() {
  console.log(`[${SOURCE_NAME}] Fetching RSS feed...`);
  const feed = await parser.parseURL(FEED_URL);

  const articles = feed.items.map((item) => ({
    title: item.title?.trim(),
    url: normalizeUrl(item.link),
    source: SOURCE_NAME,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
  }));

  console.log(`[${SOURCE_NAME}] Parsed ${articles.length} articles`);
  return articles;
}

module.exports = { fetch, SOURCE_NAME, FEED_URL, COUNTRY };
