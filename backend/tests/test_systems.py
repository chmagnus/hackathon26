import unittest

from fastapi.testclient import TestClient

from backend.src.main import app


class SystemsApiTests(unittest.TestCase):
    def setUp(self):
        self.client = self.enterContext(TestClient(app))

    def test_list_contains_only_blockchain_with_two_moons(self):
        response = self.client.get("/api/systems")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), [{
            "id": "blockchain", "title": "Blockchain",
            "colour": "#6ff2c5", "moon_count": 2,
        }])

    def test_full_planet_has_ordered_readable_lessons(self):
        response = self.client.get("/api/systems/blockchain")
        self.assertEqual(response.status_code, 200)
        planet = response.json()
        self.assertEqual(planet["title"], "Blockchain")
        self.assertFalse(planet["chain"])
        self.assertEqual(len(planet["orbits"]), 1)
        moons = planet["orbits"][0]["moons"]
        self.assertEqual([moon["id"] for moon in moons], ["ledgers", "hashing"])
        self.assertEqual([moon["order"] for moon in moons], [1, 2])
        for moon in moons:
            self.assertEqual(len(moon["dialogue_steps"]), 3)
            for step in moon["dialogue_steps"]:
                self.assertTrue(step["body"])
                self.assertIn(step["body"], moon["body"])
            self.assertIn(moon["check"]["answer"], moon["check"]["options"])

    def test_individual_moons_match_full_response(self):
        moons = self.client.get("/api/systems/blockchain").json()["orbits"][0]["moons"]
        for moon in moons:
            response = self.client.get(f"/api/systems/blockchain/moons/{moon['id']}")
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json(), moon)

    def test_unknown_resources_return_structured_404(self):
        for url, code in [
            ("/api/systems/missing", "system_not_found"),
            ("/api/systems/missing/moons/ledgers", "system_not_found"),
            ("/api/systems/blockchain/moons/missing", "moon_not_found"),
        ]:
            with self.subTest(url=url):
                response = self.client.get(url)
                self.assertEqual(response.status_code, 404)
                self.assertEqual(response.json()["error"]["code"], code)

    def test_content_routes_are_documented_and_health_still_works(self):
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("/api/systems/{system_id}/moons/{moon_id}", paths)
        self.assertEqual(self.client.get("/api/health").json(), {"status": "ok"})


if __name__ == "__main__":
    unittest.main()
