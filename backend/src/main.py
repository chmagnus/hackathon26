import json
import logging

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse, StreamingResponse

from .routes.systems import router as systems_router
from .schemas import TutorRequest
from .settings import get_settings
from .tutor import build_system_prompt, stream_with_fallback, within_daily_cap

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nova")

app = FastAPI(title="Nova API")
app.include_router(systems_router)

try:
    from workers import asgi  # only available on Cloudflare
    Default = asgi.entrypoint(app)
except ImportError:
    pass


class ApiError(Exception):
    def __init__(self, status: int, code: str, message: str):
        self.status, self.code, self.message = status, code, message


@app.exception_handler(ApiError)
async def handle_api_error(request: Request, exc: ApiError):
    return JSONResponse(
        status_code=exc.status,
        content={"error": {"code": exc.code, "message": exc.message}},
    )


def sse(event: dict) -> str:
    return f"data: {json.dumps(event)}\n\n"


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/tutor")
async def tutor(request: Request, body: TutorRequest):
    settings = get_settings(request)
    if not within_daily_cap(settings):
        raise ApiError(429, "rate_limited", "The tutor has reached today's limit. Try again tomorrow.")

    system_prompt = build_system_prompt(body)
    messages = [m.model_dump() for m in body.messages[-8:]]

    async def events():
        try:
            async for text in stream_with_fallback(settings, system_prompt, messages):
                yield sse({"type": "token", "text": text})
            yield sse({"type": "done"})
        except Exception:
            logger.exception("Tutor failed")
            yield sse({"type": "error", "message": "The tutor is unavailable right now."})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache"},
    )
