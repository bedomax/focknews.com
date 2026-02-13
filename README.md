# tagadata.com

Agregador de noticias de Chile. Board que muestra titulares de medios chilenos populares e independientes. Detecta noticias que se repiten entre medios y las destaca como trending.

Solo muestra: titular, medio, link y fecha. Sin contenido completo.

## Medios

| Medio | Tipo | Feed |
|---|---|---|
| BioBioChile | Independiente | RSS |
| Cooperativa | Mainstream (radio) | RSS |
| La Tercera | Mainstream | RSS |
| CIPER Chile | Investigativo | RSS |
| The Clinic | Independiente | RSS |
| Interferencia | Independiente | RSS |
| El Desconcierto | Independiente | RSS |

## Quick Start

```bash
nvm use stable
npm install
npm start
```

Abre http://localhost:3000

El servidor hace fetch al iniciar y cada 10 minutos.

## Fetch manual

```bash
npm run fetch
```

## Desarrollo

```bash
npm run dev
```

## API

| Endpoint | Metodo | Descripcion |
|---|---|---|
| `/` | GET | Board UI |
| `/api/news` | GET | JSON con noticias |
| `/api/news?source=BioBioChile` | GET | Filtrar por medio |
| `/api/news?sort=score` | GET | Ordenar por trending |
| `/api/fetch` | POST | Trigger fetch manual |

## Ranking / Trending

El sistema detecta cuando la misma noticia es cubierta por multiples medios usando fuzzy matching de titulares (fuzzball). Mas medios cubren la misma noticia = mayor score = card mas grande en el board.

- 2 medios = badge "multi-source"
- 3+ medios = badge "HOT", card gigante

## Deploy a Cloud Run

```bash
gcloud builds submit --tag gcr.io/YOUR_PROJECT/tagadata
gcloud run deploy tagadata \
  --image gcr.io/YOUR_PROJECT/tagadata \
  --platform managed \
  --allow-unauthenticated \
  --memory 256Mi
```

O con Docker:

```bash
docker build -t tagadata .
docker run -p 8080:8080 tagadata
```

## Agregar un nuevo medio

1. Crear `src/sources/nuevomedio.js`:

```js
const Parser = require('rss-parser');
const { normalizeUrl } = require('../utils');

const parser = new Parser();
const FEED_URL = 'https://ejemplo.cl/feed/';
const SOURCE_NAME = 'Nuevo Medio';

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

2. Registrarlo en `src/aggregator.js`
3. Agregar color en `SOURCE_COLORS` en `src/public/index.html`

## Stack

- **Backend:** Node.js + Express
- **Base de datos:** SQLite (better-sqlite3)
- **RSS:** rss-parser
- **Clustering:** fuzzball (fuzzy matching de titulares)
- **Frontend:** HTML/CSS/JS vanilla
