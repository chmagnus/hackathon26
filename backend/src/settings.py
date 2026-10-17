import os
from types import SimpleNamespace

from dotenv import load_dotenv

load_dotenv()


def get_settings(request=None):
    """Cloudflare env when deployed, .env file when running locally."""
    env = request.scope.get("env") if request is not None else None
    if env is not None:
        return env
    return SimpleNamespace(
        AI_PROVIDER=os.getenv("AI_PROVIDER", "mock"), # Placeholder for Cloudflare when deploying
        GEMINI_API_KEY=os.getenv("GEMINI_API_KEY", ""),
        GEMINI_MODEL=os.getenv("GEMINI_MODEL", "gemini-flash-latest"),
    )