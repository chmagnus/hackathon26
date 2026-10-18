# Nova

**A galaxy where every algorithm is a planet you can explore.**

Team 36 project for the GUTS 2026 Hackathon.

Nova teaches classic computer science algorithms as a galaxy you fly through. Each algorithm is a planet, its chapters are moons in orbit, and each chapter holds lessons that go deeper as you move outward. Finish every lesson on a planet and it joins your orbit.

- **Four planets, 48 lessons:** Blockchain, Dijkstra & OSPF, Sorting, and Binary Search.
- **A real hash chain:** Blockchain's lessons are SHA-256 records linked like blocks. Tamper with one in the planet's Hash chain panel and every later chapter breaks.
- **Algo, the AI tutor:** ask questions on any lesson page, and Algo answers from that lesson.

## Tech stack

- **Frontend:** React, TypeScript, Vite, three.js
- **Backend:** FastAPI (Python)

## Project structure

```
nova/
├── backend/
│   ├── src/
│   │   ├── main.py          # FastAPI app and the tutor route
│   │   ├── routes/          # /api/systems and /verify
│   │   ├── lessons/         # the authored lessons, one file per planet
│   │   ├── chain.py         # SHA-256 hash chain and verification
│   │   └── tutor.py         # tutor prompt and AI provider fallback
│   ├── tests/
│   ├── CONTENT_API.md       # the content API and how the frontend uses it
│   └── LESSONS.md           # the curriculum
├── frontend/
│   ├── src/
│   │   ├── galaxy/          # the shared three.js universe and camera
│   │   ├── screens/         # Home, Moons (planet view), Concept (lesson pages)
│   │   ├── store/           # progress saved in the browser
│   │   └── api/             # API client and generated types
│   └── tests/
├── shared/hash_vectors.json # hashing test vectors for any implementation
└── scripts/gen_types.sh     # regenerate frontend/src/api/types.ts from the API
```

## Getting started

### Prerequisites

- Python 3.12 or newer
- Node.js 22 or newer

### Local setup

```bash
# Backend
cd backend
python3 -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cd ..

# Frontend
cd frontend
npm install
cd ..
```

### Run everything

On macOS or Linux:

```bash
# Terminal 1: backend
cd backend
source .venv/bin/activate
python -m uvicorn src.main:app --reload

# Terminal 2: frontend
cd frontend
npm run dev
```

On Windows, use two terminals:

```bash
# Terminal 1
cd backend
.venv\Scripts\activate
python -m uvicorn src.main:app --reload

# Terminal 2
cd frontend
npm run dev
```

Then open:

- App: http://localhost:5173
- API docs: http://localhost:8000/docs

Run the backend command from `backend/` with its virtual environment activated.
`src` is a Python package, so use the module target `src.main:app`; no
`PYTHONPATH` override is needed. Alternatively, `fastapi dev src/main.py` works
from the same directory. Keep the backend running in its own terminal while
using the frontend.

To check the content API directly, open
http://localhost:8000/api/systems/blockchain. Tutor development uses the mock
provider by default, so no AI API key is required.

Run backend tests from the repository root, and frontend tests from `frontend/`:

```bash
backend/.venv/bin/python -m unittest discover -s backend/tests -v
cd frontend && npm test
```

Every pull request runs both, plus the frontend lint and build
(`.github/workflows/ci.yml`).

## AI tutor

Algo, the chat on every lesson page, sends the learner's questions to
`POST /api/tutor` and streams the answer back as server-sent events. The backend
tries each provider in `AI_PROVIDERS` in order. If all of them fail before
answering, it sends a canned offline reply (`mock`).

| Setting | Purpose |
| --- | --- |
| `AI_PROVIDERS` | Providers to try, comma-separated: `workers_ai`, `gemini`, `mock` (default `mock`) |
| `CF_ACCOUNT_ID`, `CF_API_TOKEN` | Cloudflare Workers AI. The token needs the Workers AI permission. |
| `WORKERS_AI_MODEL` | Default `@cf/meta/llama-3.1-8b-instruct` |
| `GEMINI_API_KEY`, `GEMINI_MODEL` | Google Gemini |
| `TUTOR_DAILY_CAP` | Questions per day before the tutor replies with a limit message (default 500, counted per instance on Cloudflare) |

Locally, copy `backend/.env.example` to `backend/.env` and fill it in. On
Cloudflare Workers, set `AI_PROVIDERS=workers_ai`, `CF_ACCOUNT_ID` and
`WORKERS_AI_MODEL` as variables and the token as a secret
(`npx wrangler secret put CF_API_TOKEN`); `src/settings.py` reads both.

The frontend calls `/api/...` on its own origin, so serve the site and the API
from the same domain, or route `/api/*` to the API Worker. While developing
without the backend, the chat answers with a fake Algo; a deployed build shows
an error message instead.


## Credits

All textures are in `frontend/public/textures/` as WebP, each in two sizes:
`*_2k.webp` (2048 wide) and `*_1k.webp` (1024 wide, used on screens narrower
than 860px). NASA imagery is in the public domain. Solar System Scope textures
are licensed [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/), so they
must stay credited. Every image was resized, and some were adjusted as noted.

| Texture | Used for | Source | Licence |
| --- | --- | --- | --- |
| `earth_day` | Blockchain (Earth) | [Blue Marble: Next Generation, December, with topography and bathymetry](https://visibleearth.nasa.gov/images/73909) (NASA Earth Observatory, Reto Stöckli) | Public domain (NASA) |
| `earth_night` | Blockchain (Earth) | [Earth at Night: Black Marble 2016](https://visibleearth.nasa.gov/images/144898) (NASA Earth Observatory, Joshua Stevens, with Suomi NPP VIIRS data from Miguel Román, NASA GSFC). Only the city lights are kept, tinted warm. | Public domain (NASA) |
| `earth_clouds` | Blockchain (Earth) | [Blue Marble clouds](https://visibleearth.nasa.gov/images/57747) (NASA Goddard Space Flight Center, MODIS). Cloud brightness is stored as alpha. | Public domain (NASA) |
| `earth_normal` | Blockchain (Earth) | Normal map computed from [Blue Marble: Next Generation topography](https://visibleearth.nasa.gov/images/73934) (NASA Earth Observatory, GEBCO data) | Public domain (NASA) |
| `earth_ocean_mask` | Blockchain (Earth) | Water mask: sea level in the topography above, plus the lakes in [Blue Marble: Next Generation, December, without bathymetry](https://visibleearth.nasa.gov/images/74218) | Public domain (NASA) |
| `ring` | Blockchain's ring | [Saturn ring alpha map](https://www.solarsystemscope.com/textures/) by Solar System Scope. Colours brightened. | CC BY 4.0 |
| `neptune` | Dijkstra & OSPF | [Neptune map](https://www.solarsystemscope.com/textures/) by Solar System Scope, based on NASA Voyager 2 imagery | CC BY 4.0 |
| `jupiter` | Sorting | [PIA07782: Cassini global map of Jupiter](https://science.nasa.gov/photojournal/) (NASA/JPL/Space Science Institute) | Public domain (NASA) |
| `mars` | Binary search | Viking MDIM 2.1 colour mosaic, from [NASA Mars Trek](https://trek.nasa.gov/mars/) (NASA/USGS) | Public domain (NASA) |
| `mars_normal` | Binary search | Normal map computed from the MGS MOLA elevation model, from [NASA Mars Trek](https://trek.nasa.gov/mars/) (NASA/JPL/GSFC) | Public domain (NASA) |
| `moon`, `moon_normal` | Chapter moons | [CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) (NASA Goddard Scientific Visualization Studio, Ernie Wright): LRO LROC colour map, and a normal map computed from the LOLA elevation map | Public domain (NASA) |

The star at the centre and the starfield have no textures: they are drawn by
shaders (`frontend/src/screens/Home/sunShaders.ts` and `Sky.tsx`).
