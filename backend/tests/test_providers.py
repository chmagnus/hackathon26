import json
import os
import unittest
from unittest.mock import patch

import httpx
from fastapi.testclient import TestClient

from backend.src import providers
from backend.src.main import app
from backend.src.providers import ProviderError, WorkersAIProvider

SETTINGS = {
    "CF_ACCOUNT_ID": "acct", "CF_API_TOKEN": "token",
    "WORKERS_AI_MODEL": "@cf/meta/llama-3.1-8b-instruct",
}
RealClient = httpx.AsyncClient


class Settings:
    def __init__(self, values):
        self.values = values

    def get(self, name):
        return self.values.get(name, "")


def workers_ai(handler):
    """Route the provider's HTTP calls to `handler` instead of Cloudflare."""
    return patch.object(providers.httpx, "AsyncClient", lambda **kwargs: RealClient(transport=httpx.MockTransport(handler), **kwargs))


def sse(*chunks):
    body = "".join(f"data: {json.dumps({'response': text})}\n\n" for text in chunks) + "data: [DONE]\n\n"
    return httpx.Response(200, text=body, headers={"content-type": "text/event-stream"})


class WorkersAIProviderTests(unittest.IsolatedAsyncioTestCase):
    async def test_streams_each_chunk_of_the_reply(self):
        requests = []

        def handler(request):
            requests.append(request)
            return sse("A hash is ", "", "a fingerprint.")

        with workers_ai(handler):
            provider = WorkersAIProvider(Settings(SETTINGS))
            chunks = [text async for text in provider.stream("Be brief.", [{"role": "user", "content": "What is a hash?"}])]
        self.assertEqual(chunks, ["A hash is ", "a fingerprint."])
        request = requests[0]
        self.assertEqual(str(request.url), "https://api.cloudflare.com/client/v4/accounts/acct/ai/run/@cf/meta/llama-3.1-8b-instruct")
        self.assertEqual(request.headers["authorization"], "Bearer token")
        body = json.loads(request.content)
        self.assertTrue(body["stream"])
        self.assertEqual(body["messages"][0], {"role": "system", "content": "Be brief."})
        self.assertEqual(body["messages"][1], {"role": "user", "content": "What is a hash?"})

    async def test_errors_are_provider_errors(self):
        with workers_ai(lambda request: httpx.Response(429, text="Too many requests")):
            provider = WorkersAIProvider(Settings(SETTINGS))
            with self.assertRaises(ProviderError) as caught:
                [text async for text in provider.stream("Be brief.", [{"role": "user", "content": "Hi"}])]
        self.assertTrue(caught.exception.rate_limited)
        with self.assertRaises(ProviderError):
            WorkersAIProvider(Settings({"WORKERS_AI_MODEL": "x"}))


class TutorRouteTests(unittest.TestCase):
    def test_tutor_streams_a_workers_ai_reply(self):
        env = {"AI_PROVIDERS": "workers_ai", "TUTOR_DAILY_CAP": "500", **SETTINGS}
        with patch.dict(os.environ, env), patch("backend.src.tutor._usage", {"day": None, "count": 0}), \
                workers_ai(lambda request: sse("Hashing turns ", "text into a fingerprint.")), TestClient(app) as client:
            response = client.post("/api/tutor", json={
                "system": "blockchain", "moon_id": "hashing",
                "messages": [{"role": "user", "content": "Explain hashing"}],
            })
        events = [json.loads(line.removeprefix("data: ")) for line in response.text.splitlines() if line.startswith("data: ")]
        self.assertEqual(events, [
            {"type": "token", "text": "Hashing turns "},
            {"type": "token", "text": "text into a fingerprint."},
            {"type": "done"},
        ])


if __name__ == "__main__":
    unittest.main()
