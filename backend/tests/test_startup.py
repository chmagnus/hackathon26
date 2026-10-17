import json
import os
from pathlib import Path
import subprocess
import sys
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient

from backend.src.main import app
from backend.src.schemas import TutorRequest
from backend.src.tutor import build_system_prompt


class StartupTests(unittest.TestCase):
    def test_import_from_backend_without_pythonpath(self):
        env = os.environ.copy()
        env.pop("PYTHONPATH", None)
        result = subprocess.run(
            [sys.executable, "-c", "from src.main import app; assert app.title == 'Nova API'"],
            cwd=Path(__file__).resolve().parents[1], env=env,
            capture_output=True, text=True, timeout=15,
        )
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_tutor_prompt_uses_content_models(self):
        request = TutorRequest(
            system="blockchain", moon_id="hashing",
            messages=[{"role": "user", "content": "Explain hashing"}],
        )
        prompt = build_system_prompt(request)
        self.assertIn('The learner is on the moon "Hashing"', prompt)
        self.assertIn("Recognise that identical inputs produce identical hashes.", prompt)
        self.assertIn("[[ledgers]]", prompt)

    def test_mock_tutor_streams_with_real_lesson_context(self):
        with patch.dict(os.environ, {"AI_PROVIDERS": "mock", "TUTOR_DAILY_CAP": "500"}), \
                patch("backend.src.tutor._usage", {"day": None, "count": 0}), \
                TestClient(app) as client:
            response = client.post("/api/tutor", json={
                "system": "blockchain", "moon_id": "hashing",
                "messages": [{"role": "user", "content": "Explain hashing"}],
            })
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.headers["content-type"].startswith("text/event-stream"))
        events = [json.loads(line.removeprefix("data: ")) for line in response.text.splitlines() if line.startswith("data: ")]
        self.assertTrue(any(event["type"] == "token" and event["text"] for event in events))
        self.assertEqual(events[-1], {"type": "done"})
        self.assertFalse(any(event["type"] == "error" for event in events))


if __name__ == "__main__":
    unittest.main()
