"""Tutor orchestration: builds the moon-aware prompt and calls providers with fallback."""
import json
import logging
from datetime import date

import httpx

from .content_data import SYSTEMS
from .providers import PROVIDERS, ProviderError

logger = logging.getLogger("nova.tutor")

def _iter_moons(planet: dict):
    for orbit in planet.get("orbits", []):
        yield from orbit.get("moons", [])


def build_system_prompt(req) -> str:
    record = SYSTEMS.get(req.system)
    planet = record.model_dump() if record is not None else None
    moon = next((m for m in _iter_moons(planet) if m["id"] == req.moon_id), None) if planet else None

    if not planet or not moon:
        return (
            "You are a friendly tutor in Nova, an app that teaches computer science "
            "algorithms as explorable planets. Keep answers under 120 words and prefer "
            "guiding questions over giving answers outright."
        )

    linked = [m for m in _iter_moons(planet) if m["id"] in moon.get("links", [])]
    linked_text = "\n\n".join(f"## {m['title']}\n{m['body']}" for m in linked) or "none"
    outline = "\n".join(f"- {m['title']} [[{m['id']}]]: {m['summary']}" for m in _iter_moons(planet))
    events = "\n".join(f"- {e.type}: {json.dumps(e.data)}" for e in req.widget_events[-5:]) or "none"
    completed = ", ".join(req.completed) or "none"

    return f"""You are a tutor inside Nova, a space-themed app teaching {planet['title']}.
The learner is on the moon "{moon['title']}". Learning goal: {moon['goal']}

CURRENT MOON:
{moon['body']}

LINKED MOONS:
{linked_text}

ALL MOONS ON THIS PLANET:
{outline}

Completed moons: {completed}
Recent widget activity:
{events}

Rules:
- Answer from the moon content first, using its terms and metaphors.
- If the answer lives on another moon, mention it as [[moon-id]].
- If you go beyond the lesson content, say so.
- Prefer guiding questions over giving answers outright.
- Never reveal the answer to this moon's completion check.
- Keep answers under 120 words."""


# Daily cap. In-memory: reliable locally; on Cloudflare each instance keeps its own
# count, so treat it as a rough safety net there.
_usage = {"day": None, "count": 0}


def within_daily_cap(settings) -> bool:
    today = date.today().isoformat()
    if _usage["day"] != today:
        _usage["day"], _usage["count"] = today, 0
    if _usage["count"] >= int(settings.get("TUTOR_DAILY_CAP")):
        return False
    _usage["count"] += 1
    return True


async def stream_with_fallback(settings, system: str, messages: list[dict]):
    """Try each provider in AI_PROVIDERS order; mock is always the last resort.

    Falls back only if a provider fails before sending any text. If it fails
    mid-reply, the error is raised so the user doesn't get a stitched-together answer.
    """
    names = [n.strip() for n in settings.get("AI_PROVIDERS").split(",") if n.strip()]
    if "mock" not in names:
        names.append("mock")

    errors = []
    for name in names:
        provider_cls = PROVIDERS.get(name)
        if provider_cls is None:
            errors.append(f"unknown provider '{name}'")
            continue
        started = False
        try:
            provider = provider_cls(settings)
            async for text in provider.stream(system, messages):
                started = True
                yield text
            return
        except (ProviderError, httpx.HTTPError, KeyError, ValueError) as exc:
            if started:
                raise
            logger.warning(
                "Tutor provider %s failed (%s), trying next: %s",
                name, type(exc).__name__, exc,
            )
            errors.append(str(exc))

    raise ProviderError("all", "; ".join(errors))
