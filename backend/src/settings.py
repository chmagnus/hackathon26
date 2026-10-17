"""Settings that work both locally (.env file) and on Cloudflare (env bindings)."""
import os

from dotenv import load_dotenv

load_dotenv()

DEFAULTS = {
    "AI_PROVIDERS": "mock",                        # comma-separated, tried in order
    "GEMINI_API_KEY": "",
    "GEMINI_MODEL": "gemini-flash-latest",
    "CF_ACCOUNT_ID": "",
    "CF_API_TOKEN": "",
    "WORKERS_AI_MODEL": "@cf/meta/llama-3.1-8b-instruct",
    "TUTOR_DAILY_CAP": "500",
}


class Settings:
    def __init__(self, env=None):
        self._env = env  # Cloudflare env object when deployed, None locally

    def get(self, name: str) -> str:
        if self._env is not None:
            value = getattr(self._env, name, None)
            if value is not None:
                return str(value)
        return os.getenv(name, DEFAULTS.get(name, ""))


def get_settings(request=None) -> Settings:
    env = request.scope.get("env") if request is not None else None
    return Settings(env)