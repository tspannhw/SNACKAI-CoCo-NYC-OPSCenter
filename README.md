# NYC Operations Command Center

A real-time infrastructure monitoring dashboard for New York City operations, built with Next.js and Snowflake.

## Features

- **Real-Time Monitoring**: Live data from traffic cameras, weather stations, air quality sensors, MTA buses, and thermal sensors
- **Interactive Map**: Leaflet-based map with colour-coded markers for all data sources
- **AI-Powered Chat**: Natural language queries via Snowflake Cortex Agent (`DEMO.DEMO.NYC_OPS_CENTER_AGENT`) with automatic fallback to `CORTEX.COMPLETE`
- **Data Visualization**: Recharts-powered charts, stat cards, and data tables with a cyberpunk/Blade Runner aesthetic
- **Export Functionality**: Download any dataset as CSV or JSON

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4, shadcn/ui (Radix UI) |
| Charts | Recharts |
| Maps | Leaflet + React-Leaflet |
| Data Warehouse | Snowflake |
| AI | Snowflake Cortex Agent / Cortex Analyst |
| Validation | Zod |
| Testing | Jest + ts-jest |

## Prerequisites

- Node.js 18+
- A Snowflake account with the semantic views listed under [Data Sources](#data-sources)
- One of the [authentication methods](#authentication) configured

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env.local   # or create .env.local manually

# 3. Edit .env.local (see Authentication section below)

# 4. Start the development server
npm run dev
# → http://localhost:4000
```

## Authentication

The app detects the best available method in this priority order:

| Priority | Method | Env Vars Required |
|---|---|---|
| 1 | **OAuth (SPCS)** | Auto-detected from `/snowflake/session/token` |
| 2 | **Key-Pair (JWT)** | `SNOWFLAKE_PRIVATE_KEY` or `SNOWFLAKE_PRIVATE_KEY_PATH` + `SNOWFLAKE_USER` |
| 3 | **PAT** | `SNOWFLAKE_PAT` |
| 4 | **Password** | `SNOWFLAKE_PASSWORD` |
| 5 | **Browser SSO** | *(fallback – not usable in server routes)* |

### Example `.env.local`

```env
SNOWFLAKE_ACCOUNT=myorg-myaccount
SNOWFLAKE_USER=my_user
SNOWFLAKE_WAREHOUSE=COMPUTE_WH
SNOWFLAKE_DATABASE=DEMO
SNOWFLAKE_SCHEMA=DEMO

# Choose ONE of the following:
SNOWFLAKE_PAT=your-programmatic-access-token
# SNOWFLAKE_PRIVATE_KEY_PATH=/path/to/rsa_key.p8
# SNOWFLAKE_PASSWORD=your-password
```

See [`AUTHENTICATION.md`](./AUTHENTICATION.md) for detailed setup instructions for each method.

## Project Structure

```
nyc-ops-center/
├── __tests__/                 # Jest unit tests
│   ├── utils.test.ts          # cn() utility tests
│   ├── validations.test.ts    # Zod schema tests
│   └── export.test.ts         # Export API route tests
├── app/
│   ├── api/
│   │   ├── air-quality/route.ts   # GET – air quality readings
│   │   ├── analyst/route.ts       # POST – Cortex Agent / AI chat
│   │   ├── cameras/route.ts       # GET – traffic camera data
│   │   ├── export/route.ts        # POST – CSV / JSON export
│   │   ├── mta/route.ts           # GET – MTA real-time bus positions
│   │   ├── thermal/route.ts       # GET – IoT thermal sensor readings
│   │   ├── traffic/route.ts       # GET – traffic events & incidents
│   │   └── weather/route.ts       # GET – weather station data
│   ├── layout.tsx
│   └── page.tsx                   # Main dashboard
├── components/
│   ├── dashboard/
│   │   ├── ai-chat.tsx            # Cortex Agent chat panel
│   │   ├── badges.tsx             # Severity / status badges
│   │   ├── charts.tsx             # Recharts wrappers
│   │   ├── cyber-map.tsx          # Leaflet map with marker layers
│   │   ├── data-table.tsx         # Sortable table with export button
│   │   ├── stat-card.tsx          # KPI stat cards
│   │   └── types.ts               # Shared TypeScript interfaces
│   └── ui/                        # shadcn/ui primitives
├── lib/
│   ├── snowflake.ts               # Connection pool & query helpers
│   ├── utils.ts                   # cn() className utility
│   └── validations.ts             # Zod schemas for all API data shapes
├── scripts/
│   └── test-auth.ts               # Manual auth smoke-test script
├── Dockerfile                     # Container image
├── jest.config.ts                 # Jest / ts-jest configuration
└── next.config.ts
```

## API Endpoints

| Endpoint | Method | Cache | Description |
|---|---|---|---|
| `/api/cameras` | GET | 30 s | Traffic camera feeds |
| `/api/traffic` | GET | 30 s | Traffic events and incidents |
| `/api/mta` | GET | 15 s | MTA bus real-time positions |
| `/api/thermal` | GET | 30 s | IoT thermal/environmental sensors |
| `/api/weather` | GET | 60 s | Weather station current conditions |
| `/api/air-quality` | GET | 60 s | EPA air quality index readings |
| `/api/analyst` | POST | — | AI chat – sends question to Cortex Agent |
| `/api/export` | POST | — | Export a data array as CSV or JSON |

### `/api/analyst` Request Body

```json
{ "question": "How many cameras are currently blocked?" }
```

### `/api/export` Request Body

```json
{
  "data": [{ "id": 1, "name": "FDR Camera" }],
  "filename": "cameras",
  "format": "csv"
}
```

## Data Sources (Snowflake)

| Semantic View / Table | Used By |
|---|---|
| `DEMO.DEMO.NYC_CAMERA_SEMANTIC_VIEW` | `/api/cameras` |
| `DEMO.DEMO.NYC_TRAFFIC_EVENTS_SEMANTIC_VIEW` | `/api/traffic` |
| `DEMO.DEMO.NYC_WEATHER_SEMANTIC_VIEW` | `/api/weather` |
| `DEMO.DEMO.NYC_AIR_QUALITY_SEMANTIC_VIEW` | `/api/air-quality` |
| `DEMO.DEMO.THERMAL_SENSOR_SEMANTIC_VIEW` | `/api/thermal` |
| `DEMO.DEMO.SVMTA` | `/api/mta` |
| `DEMO.DEMO.NYC_OPS_CENTER_AGENT` | `/api/analyst` |

## Scripts

```bash
npm run dev        # Development server on :4000
npm run build      # Production build
npm run start      # Production server on :4000
npm run lint       # ESLint
npm test           # Jest unit tests
npm run test:auth  # Manual Snowflake auth smoke-test
```

## Docker

```bash
docker build -t nyc-ops-center .
docker run -p 4000:4000 \
  -e SNOWFLAKE_ACCOUNT=myorg-myaccount \
  -e SNOWFLAKE_USER=my_user \
  -e SNOWFLAKE_PAT=... \
  nyc-ops-center
```

## License

Private – All rights reserved
