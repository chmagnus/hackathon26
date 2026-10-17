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

### Learning content

The content API includes 48 lessons: Blockchain (16), Dijkstra & OSPF (12),
Sorting (12), and Binary Search (8). Each has five dialogue steps, a learning
goal, worked examples, a checkpoint, and tutor questions. See
[the curriculum](backend/LESSONS.md) and [API integration notes](backend/CONTENT_API.md).
The frontend loads these paths from the content API. Run both servers, choose
a name or continue as a guest, and use a planet or an **Explore** button. Open
its first chapter and choose a lesson. Use **Previous/Next** or scroll through
the story, then pass its checkpoint and press **Complete moon**. Completed
chapters unlock later ones; completing every lesson captures the planet into
your orbit. Progress and capture order are stored in this browser under
`galaxy-progress-v1`. **Reset progress** on Home clears them after confirmation.

After pulling, run `npm install` in `frontend/` for the Markdown renderer.
The existing shared canvas and camera are retained. Ledgers and Hashing have
interactive scenes; all other lessons use the same story/checkpoint layout.
The default mock tutor works without API keys and identifies itself as offline.

Frontend checks: `npm run build`, `npm run lint`, and `npm test` inside
`frontend/`. The progress test uses Node's built-in TypeScript stripping
(Node 22.6+ or 24). Regenerate API types after schema changes with
`bash scripts/gen_types.sh` from the repository root; the generator is isolated
from the app's TypeScript version.

