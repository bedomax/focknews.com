# focknews.com

MVP news aggregator board. Pulls headlines from Deutsche Welle, NBC News, and Mongabay via RSS feeds.

Shows only: title, source, link, and publication date. No full article content.

## Quick Start

```bash
nvm use stable
npm install
npm start
```

Open http://localhost:3000

The server fetches news on startup and every 10 minutes automatically.

## Manual Fetch

```bash
npm run fetch
```

## Development

```bash
npm run dev
```

Uses `node --watch` for auto-reload.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Board UI |
| `/api/news` | GET | JSON list of articles |
| `/api/news?source=NBC News` | GET | Filter by source |
| `/api/fetch` | POST | Trigger manual fetch |

## Deploy to Cloud Run

```bash
# Build and push
gcloud builds submit --tag gcr.io/YOUR_PROJECT/focknews

# Deploy
gcloud run deploy focknews \
  --image gcr.io/YOUR_PROJECT/focknews \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi
```

Or with Docker locally:

```bash
docker build -t focknews .
docker run -p 8080:8080 focknews
```

## Adding a New Source

1. Create `src/sources/newsource.js`:

```js
const Parser = require('rss-parser');
const { normalizeUrl } = require('../utils');

const parser = new Parser();
const FEED_URL = 'https://example.com/feed.xml';
const SOURCE_NAME = 'Example News';

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

module.exports = { fetch, SOURCE_NAME, FEED_URL };
```

2. Register it in `src/aggregator.js`:

```js
const sources = [
  require('./sources/dw'),
  require('./sources/nbc'),
  require('./sources/mongabay'),
  require('./sources/newsource'), // add here
];
```

That's it. The new source appears automatically in the board filters.

## Stack

- **Backend:** Node.js + Express
- **Database:** SQLite (via better-sqlite3)
- **RSS Parsing:** rss-parser
- **Frontend:** Vanilla HTML/CSS/JS
