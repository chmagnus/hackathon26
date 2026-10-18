# Nova

**A galaxy where every algorithm is a planet you can explore.**

Team 36 project for the GUTS 2026 Hackathon.

Nova teaches classic computer science algorithms as explorable star systems. Each algorithm is a star, its concepts are moons in orbit, and each orbit is a chain of ideas that goes deeper as you move outward. Our first system teaches **blockchain**.

## Tech stack

- **Frontend:** React, TypeScript, Vite, three.js
- **Backend:** FastAPI (Python)

## Project structure

```
nova/
├── backend/
│   ├── src/
│   │   └── main.py        # FastAPI app
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── screens/       # Home, Moon, Concept
│       └── shared/        # reusable components
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

Run backend tests from the repository root:

```bash
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

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
Cloudflare, `backend/wrangler.jsonc` sets the variables, and the two Workers AI
credentials are secrets (see below); `src/settings.py` reads both.

While developing without the backend, the chat answers with a fake Algo; a
deployed build shows an error message instead.

## Deploy to Cloudflare

One Worker serves everything (`backend/wrangler.jsonc`): the FastAPI backend
runs as a Python Worker for `/api/*`, and `frontend/dist` is served as static
assets on the same domain. You need a Cloudflare account, Node and
[uv](https://docs.astral.sh/uv/).

1. Log in: `npx wrangler login`
2. Build the site: `cd frontend && npm ci && npm run build`
3. Deploy, from `backend/`: `uvx --from workers-py pywrangler deploy`. It
   prints the site's address, `https://nova.<your-subdomain>.workers.dev`.
4. Give the tutor its Workers AI credentials. In the Cloudflare dashboard, open
   **Workers AI** > **Use REST API**, create a Workers AI API token, and copy it
   and the Account ID. Then, from `backend/`, run
   `npx wrangler secret put CF_ACCOUNT_ID` and
   `npx wrangler secret put CF_API_TOKEN`. Until then, Algo gives offline replies.

To redeploy, repeat steps 2 and 3. `npx wrangler tail`, run from `backend/`,
streams the live logs. Use `uvx` as above rather than `uv run`, which would
also change `backend/.venv`, your local development environment.

