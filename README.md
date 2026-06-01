# New Zealand Migration Inflow Explorer

An interactive web application that visualises international migration inflows into New Zealand. Built with React, deck.gl, and MapLibre GL, it renders animated arc layers on a dark-theme world map, letting users explore migration volumes by country of origin, continent, and year.

---

## Features

- **Interactive globe/map** – arc layers connect each source country to New Zealand, coloured and sized by migration volume
- **Continent grouping** – arcs aggregate to continent landing points at wider zoom levels
- **Year slider** – scrub through available years to see how migration patterns change over time
- **Country sidebar** – click any arc or country to see detailed inflow statistics
- **Colour-coded legend** – Jenks natural-breaks classification for intuitive choropleth colouring

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

## Prerequisites

- **Node.js** ≥ 18 and **npm** ≥ 9
- **Python** ≥ 3.10 (only needed to regenerate processed data)
- The processed data file `public/data/migration.json` is committed so the app can run immediately after cloning

---

## Local Setup

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd New-Zealand-Migration-Inflow-Explorer
```

### 2. Install JavaScript dependencies

```bash
npm install
```

### 3. Start the development server

```bash
npm run dev
```

The app is served at `http://localhost:5173` by default (Vite will print the exact URL).

### Regenerate the migration data

This step is optional for normal local setup. Re-run it only when the source Excel file changes.

This step reads `migration_data1.xlsx` and writes `public/data/migration.json`.

```bash
# Install Python dependencies (first time only)
pip3 install numpy

# Run the preprocessor
npm run preprocess
# or equivalently:
python3 scripts/preprocess.py
```

> The generated `public/data/migration.json` is consumed by the app at runtime and should stay committed.

---

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start the Vite dev server with hot-module replacement |
| `npm run build` | Type-check and produce a production build in `dist/` |
| `npm run preview` | Locally preview the production build |
| `npm run preprocess` | Run the Python data preprocessing script |

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
│   │   ├── MapLegend/            # Choropleth colour legend
│   │   ├── Sidebar/              # Country detail panel
│   │   └── YearSlider/           # Year selection control
│   ├── store/
│   │   └── useAppStore.ts        # Zustand global state
│   ├── types/                    # Shared TypeScript types
│   └── utils/                    # Colour scale, data helpers
├── migration_data1.xlsx          # Raw source data
├── index.html
├── vite.config.ts
└── package.json
```

---

## Production Build

```bash
npm run build
```

The optimised output is written to `dist/`. Serve it with any static file host (Nginx, Vercel, Netlify, GitHub Pages, etc.):

```bash
# Quick local preview
npm run preview
```

---

## Notes

- The map tiles are loaded from the [CARTO Basemaps](https://carto.com/basemaps/) free CDN. No API key is required.
- `migration_data1.xlsx` contains the raw Stats NZ migration data used by `scripts/preprocess.py`.
