# tagadata.com

Multi-country news aggregator. A collage-style board that shows headlines from mainstream and independent outlets. Detects when the same story is covered by multiple sources and highlights it as trending.

Only displays: headline, source, link, and time. No full article content.

## Countries

### Chile
| Source | Type | Feed |
|---|---|---|
| BioBioChile | Independent | RSS |
| Cooperativa | Mainstream (radio) | RSS |
| La Tercera | Mainstream | RSS |
| CIPER Chile | Investigative | RSS |
| The Clinic | Independent | RSS |
| Interferencia | Independent | RSS |
| El Desconcierto | Independent | RSS |

### Ecuador
| Source | Type | Feed |
|---|---|---|
| El Comercio | Mainstream | RSS |
| El Universo | Mainstream | RSS |
| Metro Ecuador | Mainstream | RSS |
| GK | Independent | RSS |
| La Barra Espaciadora | Investigative | RSS |
| Plan V | Investigative | RSS |
| Confirmado | Independent | RSS |

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:3000. The server fetches all RSS feeds on startup and refreshes every 5 minutes.

## API

| Endpoint | Method | Description |
|---|---|---|
| `/` | GET | Collage board UI |
| `/api/news?country=cl` | GET | News filtered by country (`cl`, `ec`) |
| `/api/news?tag=gobierno` | GET | Filter by trending tag |
| `/api/news?sort=score` | GET | Sort by trending score |
| `/api/news?limit=15&offset=0` | GET | Pagination |
| `/api/geo` | GET | Detect country from IP |
| `/api/fetch` | POST | Trigger manual fetch |

## Trending / Clustering

The system detects when the same story is covered by multiple sources using fuzzy title matching ([fuzzball](https://github.com/nol13/fuzzball.js)). More sources covering the same story = higher score = bigger card on the board.

- 2 sources = "multi-source" badge
- 3+ sources = "HOT" badge, hero card

Score formula: `(unique_sources * 30) * e^(-age_hours / 24)`

## Deploy to Google Cloud Run

```bash
# Build and push image
gcloud builds submit --tag us-central1-docker.pkg.dev/PROJECT_ID/docker-repo/tagadata

# Deploy with always-on instance (required for the 5-min fetch interval)
gcloud run deploy tagadata \
  --image us-central1-docker.pkg.dev/PROJECT_ID/docker-repo/tagadata \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --min-instances 1 \
  --max-instances 3
```

Or run locally with Docker:

```bash
docker build -t tagadata .
docker run -p 8080:8080 tagadata
```

> `--min-instances 1` keeps at least one instance alive so the `setInterval` fetch runs continuously.

## Adding a New Country

1. Create source modules in `src/sources/XX/`:

```js
const Parser = require('rss-parser');
const { normalizeUrl } = require('../../utils');

const parser = new Parser();
const FEED_URL = 'https://example.com/feed/';
const SOURCE_NAME = 'New Source';
const COUNTRY = 'xx';

async function fetch() {
  console.log(`[${SOURCE_NAME}] Fetching RSS feed...`);
  const feed = await parser.parseURL(FEED_URL);
  return feed.items.map((item) => ({
    title: item.title?.trim(),
    url: normalizeUrl(item.link),
    source: SOURCE_NAME,
    published_at: item.pubDate ? new Date(item.pubDate).toISOString() : null,
  }));
}

module.exports = { fetch, SOURCE_NAME, FEED_URL, COUNTRY };
```

2. Register sources in `src/aggregator.js`
3. Add country to `COUNTRIES` and `SOURCE_COLORS_BY_COUNTRY` in `src/public/app.js`
4. Add country code to `VALID_COUNTRIES` in `src/server.js`
5. Add `.source-dot.name` colors in `src/public/styles.css`

## Stack

- **Runtime:** Node.js 22
- **Server:** Express 5
- **Database:** SQLite (better-sqlite3, WAL mode)
- **RSS:** rss-parser
- **Clustering:** fuzzball (fuzzy string matching)
- **Frontend:** Vanilla HTML/CSS/JS
- **Deploy:** Docker / Google Cloud Run
