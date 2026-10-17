"""AI providers. Each one turns (system prompt, messages) into streamed text chunks."""
import json

import httpx

TIMEOUT = httpx.Timeout(20.0, connect=5.0)


class ProviderError(Exception):
    def __init__(self, provider: str, message: str, rate_limited: bool = False):
        super().__init__(f"{provider}: {message}")
        self.provider = provider
        self.rate_limited = rate_limited


def _raise_for_status(provider: str, response: httpx.Response) -> None:
    if response.status_code == 429:
        raise ProviderError(provider, "rate limited", rate_limited=True)
    if response.status_code >= 400:
        raise ProviderError(provider, f"HTTP {response.status_code}: {response.text[:200]}")


class MockProvider:
    """Canned replies. Use during development and as the final fallback."""
    name = "mock"

    def __init__(self, settings):
        pass

    async def stream(self, system: str, messages: list[dict]):
        last = messages[-1]["content"] if messages else ""
        reply = (
            f"(Offline tutor) You asked: \"{last}\". "
            "The live tutor isn't available right now, so try re-reading this moon "
            "or check the linked moons for more detail."
        )
        for word in reply.split(" "):
            yield word + " "


class GeminiProvider:
    """Google Gemini via the REST API, streamed with server-sent events."""
    name = "gemini"

    def __init__(self, settings):
        self.key = settings.get("GEMINI_API_KEY")
        self.model = settings.get("GEMINI_MODEL")
        if not self.key:
            raise ProviderError(self.name, "GEMINI_API_KEY is not set")

    async def stream(self, system: str, messages: list[dict]):
        url = (
            "https://generativelanguage.googleapis.com/v1beta/models/"
            f"{self.model}:streamGenerateContent"
        )
        payload = {
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [
                {
                    "role": "model" if m["role"] == "assistant" else "user",
                    "parts": [{"text": m["content"]}],
                }
                for m in messages
            ],
            "generationConfig": {"maxOutputTokens": 400},
        }
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            async with client.stream(
                "POST",
                url,
                params={"alt": "sse"},
                headers={"x-goog-api-key": self.key},
                json=payload,
            ) as response:
                if response.status_code >= 400:
                    await response.aread()
                    _raise_for_status(self.name, response)
                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = json.loads(line[len("data:"):].strip())
                    candidates = data.get("candidates") or []
                    if not candidates:
                        continue
                    for part in candidates[0].get("content", {}).get("parts", []):
                        if part.get("text"):
                            yield part["text"]


class WorkersAIProvider:
    """Cloudflare Workers AI via its REST API (works locally and when deployed)."""
    name = "workers_ai"

    def __init__(self, settings):
        self.account = settings.get("CF_ACCOUNT_ID")
        self.token = settings.get("CF_API_TOKEN")
        self.model = settings.get("WORKERS_AI_MODEL")
        if not (self.account and self.token):
            raise ProviderError(self.name, "CF_ACCOUNT_ID or CF_API_TOKEN is not set")

    async def stream(self, system: str, messages: list[dict]):
        url = f"https://api.cloudflare.com/client/v4/accounts/{self.account}/ai/run/{self.model}"
        payload = {
            "messages": [{"role": "system", "content": system}, *messages],
            "max_tokens": 400,
        }
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.post(
                url, headers={"Authorization": f"Bearer {self.token}"}, json=payload
            )
        _raise_for_status(self.name, response)
        yield response.json()["result"]["response"]


PROVIDERS = {
    "mock": MockProvider,
    "gemini": GeminiProvider,
    "workers_ai": WorkersAIProvider,
}