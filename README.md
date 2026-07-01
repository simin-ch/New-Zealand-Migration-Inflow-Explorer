# New Zealand Migration Inflow Explorer

An interactive web application that visualises international migration inflows into New Zealand. Built with React, deck.gl, and MapLibre GL, it renders animated arc layers on a dark-theme world map, letting users explore migration volumes by country of origin, continent, and year.

**Data source:** Statistics New Zealand (Stats NZ), 2016–2025

**Live demo:** https://simin-ch.github.io/New-Zealand-Migration-Inflow-Explorer/


---

## Features

### Global view

- **Continental arc map** — five stylised arcs connect each continent to New Zealand; arc width and colour encode inflow volume and region
- **Animated flow pulses** — pulses travel along arcs toward NZ to suggest ongoing movement
- **Global KPI sidebar** — total inflow, year-on-year change, net migration, visa-type breakdown, top-5 country ranking, and a multi-year trend chart
- **Year slider** — scrub, tick-jump, or play/pause through 2016–2025; all views update synchronously

### Country view

- **Semantic zoom** — double-click the map (or click a country in the sidebar ranking) to fly into country-level detail
- **Country dot markers** — each source country is a map point; size reflects inflow volume, colour follows Jenks volume classes
- **Inflow volume legend** — six-band Jenks natural-breaks scale (clickable to filter countries by volume class)
- **Country profile sidebar** — global rank badge, previous/next rank navigation, visa structure, per-country trend, and age–sex pyramid

### Cross-cutting interactions

- **Visa-type filter** — click Student, Work, Resident, Visitor, or Other in the sidebar to refilter the map, rankings, and charts
- **Linked navigation** — sidebar rankings, map markers, and country profiles all drive the same map focus and selection state

---

## Setup

### Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.10 (only needed to regenerate processed data)
- The processed data file `public/data/migration.json` is committed, so the app runs immediately after cloning

### Local development

```bash
git clone https://github.com/simin-ch/New-Zealand-Migration-Inflow-Explorer.git
cd New-Zealand-Migration-Inflow-Explorer
npm install
npm run dev
```

The app is served at `http://localhost:5173` by default (Vite prints the exact URL).

### Regenerate migration data (optional)

Re-run this only when `migration_data1.xlsx` changes. It reads the Excel file and writes `public/data/migration.json`.

```bash
pip3 install numpy
npm run preprocess
# or: python3 scripts/preprocess.py
```

> Keep the generated `public/data/migration.json` committed so others can run the app without preprocessing.

### Available scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server with hot-module replacement |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Locally preview the production build |
| `npm run preprocess` | Run the Python data preprocessing script |

### Production build

```bash
npm run build
```

The optimised output is written to `dist/`. Serve it with any static file host (Nginx, Vercel, Netlify, GitHub Pages, etc.):

```bash
npm run preview   # quick local preview of the production build
```

Pushes to `main` deploy automatically to GitHub Pages via `.github/workflows/deploy-pages.yml`.

---

## Tech Stack

| Layer | Library |
|-------|---------|
| UI framework | React 18 + TypeScript |
| Map renderer | MapLibre GL 5 |
| 3-D layers | deck.gl 9 (ArcLayer, GeoJsonLayer) |
| Charting | Apache ECharts 5 |
| State management | Zustand 5 |
| Styling | Tailwind CSS 3 |
| Build tool | Vite 6 |
| Data preprocessing | Python 3 + NumPy + openpyxl |

---

## Project Structure

```
├── public/
│   └── data/
│       └── migration.json        # Generated runtime data, committed for local/dev deploys
├── scripts/
│   └── preprocess.py             # Excel → JSON data pipeline
├── src/
│   ├── App.tsx                   # Root component & data loader
│   ├── components/
│   │   ├── Map/MapView.tsx       # MapLibre + deck.gl map canvas
│   │   ├── MapLegend/            # Inflow volume legend & class filter
│   │   ├── Sidebar/              # Global KPIs & country profile panel
│   │   └── YearSlider/           # Year selection & playback control
│   ├── store/
│   │   └── useAppStore.ts        # Zustand global state
│   ├── types/                    # Shared TypeScript types
│   └── utils/                    # Colour scale, data helpers
├── migration_data1.xlsx          # Raw Stats NZ source data
├── index.html
├── vite.config.ts
└── package.json
```

---

## Design Documentation

For problem rationale, visual system, interaction model, trade-offs, and design process, see **[DESIGN.md](./DESIGN.md)**.

---

## Notes

- Map tiles are loaded from the [CARTO Basemaps](https://carto.com/basemaps/) free CDN. No API key is required.
- `migration_data1.xlsx` contains the raw Stats NZ migration data used by `scripts/preprocess.py`.
- Jenks natural-breaks thresholds are computed once at preprocess time and stored in `migration.json` as `meta.jenksBreaks`.
