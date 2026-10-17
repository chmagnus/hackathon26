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

