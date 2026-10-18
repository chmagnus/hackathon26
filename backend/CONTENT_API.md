# Learning content API

Four authored paths are available using the existing routes and snake_case models.

| Planet ID | Chapters | Lessons | Dialogue steps |
| --- | ---: | ---: | ---: |
| `blockchain` | 4 | 16 | 80 |
| `dijkstra` | 3 | 12 | 60 |
| `sorting` | 3 | 12 | 60 |
| `binary-search` | 2 | 8 | 40 |

Each lesson has a learning goal, five ordered explanation steps, a worked example
or application, limitations and common mistakes, one three-option checkpoint,
and two suggested tutor questions. The full body is generated from those same
steps so the tutor and reading UI receive identical material. Lesson links use
`[[moon-id]]` and remain within the current planet.

## Run and inspect

```bash
cd backend
source .venv/bin/activate
python -m uvicorn src.main:app --reload
```

Open <http://localhost:8000/docs>, or request:

| Route | Result |
| --- | --- |
| `GET /api/systems` | All four planet summaries and their actual lesson counts |
| `GET /api/systems/{system_id}` | Planet introduction, ordered chapters and all lessons |
| `GET /api/systems/{system_id}/moons/{moon_id}` | One full lesson |

Examples:

- `/api/systems/blockchain/moons/proof-of-work`
- `/api/systems/dijkstra/moons/worked-shortest-path`
- `/api/systems/sorting/moons/merge-sort`
- `/api/systems/binary-search/moons/duplicate-boundaries`

Unknown resources return HTTP 404 and the existing `error.code` / `error.message`
shape. The tutor uses this same content registry automatically.

## Source and integration

`src/content_data.py` exports `SYSTEMS` and the planet constants. Authored content
is separated into four files under `src/lessons/`; the small helpers there assemble
it into the existing Pydantic models. There is no database, content loader, API
schema change, or new dependency in this content update. Restart FastAPI after
editing content unless using reload mode.

Blockchain has `chain: true`: its lessons form a real SHA-256 hash chain, built in
`src/chain.py`. The star introduction is the genesis record (`star.hash`), and each
moon's `hash` covers its `prev_hash` plus its canonical title and body, in orbit
and moon order. Other planets keep `chain: false` and null hashes. The hashing rules
and test vectors for a matching frontend implementation are in
`shared/hash_vectors.json`.

`POST /api/systems/{id}/verify` takes `{"edits": {"moon-id": "new body"}}` and
returns every moon's recomputed `hash`, whether it still matches its record
(`valid`), and `first_broken`. An edit breaks that moon and every later one;
whitespace-only changes do not. Nothing is saved. Errors: `system_not_found` and
`moon_not_found` (404), `chain_disabled` (409) for planets without a chain.
`nonces` is accepted but reserved for the mining step. Widget fields remain null
because reading and checkpoints are usable without an unfinished widget.

The frontend now fetches the planet list and full planet responses through the
Vite `/api` proxy to port 8000, passing real content and progress to `MoonsScreen`.
Concept pages fetch the individual moon endpoint using both planet and moon IDs.
Errors show a retry action rather than silently substituting old lesson copies.
`dialogue_steps` renders through the team's story layout, including Markdown
code blocks and internal lesson links. Chapter moons represent orbits; concepts
inside each chapter are the API's `moons` list. Existing Blockchain IDs, including
`ledgers` and `hashing`, are retained for navigation/progress compatibility.

Local progress keeps `version`, `systems` (completed lesson IDs and edits), and
`captured` (planet IDs in completion order). Older saved progress without capture
order still loads. Complete a checkpoint to save a lesson; complete earlier
chapters to unlock later ones. The backend supplies content, not accounts or
server-side progress. API schemas and route paths are unchanged by integration.

Run content and API tests from the repository root:

```bash
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```

See [LESSONS.md](LESSONS.md) for the curriculum, source references, and authoring notes.
