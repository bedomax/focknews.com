# tagadata.com

Agregador de noticias multi-pais. Board tipo collage que muestra titulares de medios populares e independientes. Detecta noticias que se repiten entre medios y las destaca como trending.

Solo muestra: titular, medio, link y fecha. Sin contenido completo.

## Paises

### Chile
| Medio | Tipo | Feed |
|---|---|---|
| BioBioChile | Independiente | RSS |
| Cooperativa | Mainstream (radio) | RSS |
| La Tercera | Mainstream | RSS |
| CIPER Chile | Investigativo | RSS |
| The Clinic | Independiente | RSS |
| Interferencia | Independiente | RSS |
| El Desconcierto | Independiente | RSS |

### Ecuador
| Medio | Tipo | Feed |
|---|---|---|
| El Comercio | Mainstream | RSS |
| El Universo | Mainstream | RSS |
| Metro Ecuador | Mainstream | RSS |
| GK | Independiente | RSS |
| La Barra Espaciadora | Investigativo | RSS |
| Plan V | Investigativo | RSS |
| Confirmado | Independiente | RSS |

## Quick Start (local)

```bash
npm install
npm run dev
```

Requiere configurar las env vars de Vercel Postgres (ver seccion Deploy).

## API

| Endpoint | Metodo | Descripcion |
|---|---|---|
| `/` | GET | Board UI |
| `/api/news` | GET | JSON con noticias |
| `/api/news?country=cl` | GET | Filtrar por pais |
| `/api/news?tag=gobierno` | GET | Filtrar por tag |
| `/api/news?sort=score` | GET | Ordenar por trending |
| `/api/geo` | GET | Detectar pais por IP |
| `/api/cron/fetch` | GET | Trigger fetch (cron) |

## Ranking / Trending

El sistema detecta cuando la misma noticia es cubierta por multiples medios usando fuzzy matching de titulares (fuzzball). Mas medios cubren la misma noticia = mayor score = card mas grande en el board.

- 2 medios = badge "multi-source"
- 3+ medios = badge "HOT", card gigante

## Deploy a Vercel

1. Crear proyecto en Vercel y conectar el repo
2. Crear Postgres store en Storage → Create → Postgres
3. Vincular el store al proyecto (env vars se inyectan automaticamente)
4. Agregar `CRON_SECRET` en env vars
5. Deploy — el cron corre cada hora y llena la DB

## Agregar un nuevo pais

1. Crear carpeta `src/sources/XX/` con los modulos de cada medio:

```js
const Parser = require('rss-parser');
const { normalizeUrl } = require('../../utils');

const parser = new Parser();
const FEED_URL = 'https://ejemplo.com/feed/';
const SOURCE_NAME = 'Nuevo Medio';
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

2. Registrarlo en `src/aggregator.js`
3. Agregar el pais en `COUNTRIES` y `SOURCE_COLORS_BY_COUNTRY` en `src/public/app.js`
4. Agregar el pais en `VALID_COUNTRIES` en `api/news.js` y `api/geo.js`
5. Agregar colores `.source-dot.nombre` en `src/public/styles.css`

## Stack

- **Hosting:** Vercel (serverless functions + cron jobs)
- **Base de datos:** Vercel Postgres (Neon)
- **RSS:** rss-parser
- **Clustering:** fuzzball (fuzzy matching de titulares)
- **Frontend:** HTML/CSS/JS vanilla
