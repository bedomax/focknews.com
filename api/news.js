const { getNews, getCount } = require('../src/db');
const { extractTags, getArticleIdsByTag } = require('../src/tags');

const VALID_COUNTRIES = ['cl', 'ec'];

module.exports = async function handler(req, res) {
  const { source, tag, limit, offset, sort, country } = req.query;

  const cc = VALID_COUNTRIES.includes(country) ? country : 'cl';

  let ids;
  if (tag) {
    ids = await getArticleIdsByTag(tag, cc);
    if (ids.length === 0) {
      const tags = await extractTags(72, 15, cc);
      return res.json({ articles: [], tags, count: 0, country: cc });
    }
  }

  const articles = await getNews({
    source: source || undefined,
    country: cc,
    ids,
    limit: limit ? parseInt(limit, 10) : 15,
    offset: offset ? parseInt(offset, 10) : 0,
    sort: sort === 'score' ? 'score' : 'date',
  });
  const tags = await extractTags(72, 15, cc);
  const count = tag ? ids.length : await getCount({ source: source || undefined, country: cc });

  res.json({ articles, tags, count, country: cc });
};
