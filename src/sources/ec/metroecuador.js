const Parser = require('rss-parser');
const { normalizeUrl } = require('../utils');

const parser = new Parser();
const FEED_URL = 'https://www.metroecuador.com.ec/rss.xml';
const SOURCE_NAME = 'Metro Ecuador';
const COUNTRY = 'ec';

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
