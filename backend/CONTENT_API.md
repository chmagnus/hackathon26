# First content API: Blockchain and two moons

This feature returns one planet, one Foundations orbit, and two ordered moons:
`ledgers` and `hashing`. Each moon has three dialogue steps and a multiple-choice
checkpoint. Fixtures live in `src/content_data.py`; models live in `src/schemas.py`.
There is no Markdown loader, hash verification, tutor, or server-side progress in
this feature. `chain` is false until chain verification is implemented.

## Run and try it

From the repository root:

```bash
cd backend
source .venv/bin/activate
# On first setup, create .venv with uv venv, then install dependencies:
# uv pip install -r requirements.txt
fastapi dev src/main.py
```

Open <http://localhost:8000/docs> and use **Try it out**, or visit:

| URL | Result |
| --- | --- |
| `/api/systems` | Home-screen planet list, with `moon_count: 2` |
| `/api/systems/blockchain` | Full planet with both lessons |
| `/api/systems/blockchain/moons/ledgers` | The Ledgers lesson |
| `/api/systems/blockchain/moons/hashing` | The Hashing lesson |

Unknown planets and moons return HTTP 404 with
`{"error": {"code": "system_not_found", "message": "..."}}` or
`moon_not_found`. These GET endpoints do not save or change any data.

## Frontend integration handoff

Keep `/api/systems` and `star` naming for compatibility with the team contract;
they represent planets and the planet introduction. JSON fields use snake_case.

The frontend owner needs to add this to the existing Vite configuration:

```ts
server: { proxy: { '/api': 'http://localhost:8000' } },
```

With Vite and FastAPI both running, request the planet:

```ts
const response = await fetch('/api/systems/blockchain');
if (!response.ok) throw new Error('Could not load Blockchain');
const planet = await response.json();
const moons = planet.orbits.flatMap((orbit) => orbit.moons);
```

Use `planet.title` and `planet.colour` for the planet. Draw moons from `moons`,
in their returned order. On a moon click, use its already-loaded
`dialogue_steps` array for Next/Back dialogue boxes, then show `check`. Render
step `body` as Markdown and `[[moon-id]]` as a link to another moon. Completion
is checked locally against `check.answer`; answers are public in this prototype.

The frontend controls positions, zoom, loading/error states, and progress.
Its current hard-coded Blockchain count of five should become the API's
`moon_count` of two. Visuals and the Vite config are not changed by this feature.

The new `MoonsScreen` accepts the full response through its `planet` prop. It
currently draws one visible moon per orbit/chapter and lists that chapter's
concepts inside a panel. This fixture therefore produces one Foundations
chapter moon containing Ledgers and Hashing. Showing each concept as a separate
visible moon would need a frontend layout change. Add `dialogue_steps` to the
frontend Moon type (or generate types from OpenAPI) before using the dialogue UI.

Run the backend tests from the repository root:

```bash
backend/.venv/bin/python -m unittest discover -s backend/tests -v
```
