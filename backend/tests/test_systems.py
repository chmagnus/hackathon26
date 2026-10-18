import unittest

from fastapi.testclient import TestClient

from backend.src.main import app


class SystemsApiTests(unittest.TestCase):
    def setUp(self):
        self.client = self.enterContext(TestClient(app))

    def test_list_contains_all_four_learning_paths(self):
        response = self.client.get("/api/systems")
        self.assertEqual(response.status_code, 200)
        self.assertEqual({system["id"]: system["moon_count"] for system in response.json()}, {
            "blockchain": 16, "dijkstra": 12, "sorting": 12, "binary-search": 8,
        })

    def test_full_planet_has_ordered_readable_lessons(self):
        response = self.client.get("/api/systems/blockchain")
        self.assertEqual(response.status_code, 200)
        planet = response.json()
        self.assertEqual(planet["title"], "Blockchain")
        self.assertTrue(planet["chain"])
        self.assertEqual(len(planet["orbits"]), 4)
        moons = [moon for orbit in planet["orbits"] for moon in orbit["moons"]]
        self.assertEqual([moon["id"] for moon in moons[:2]], ["ledgers", "hashing"])
        for moon in moons:
            self.assertEqual(len(moon["dialogue_steps"]), 5)
            for step in moon["dialogue_steps"]:
                self.assertTrue(step["body"])
                self.assertIn(step["body"], moon["body"])
            self.assertIn(moon["check"]["answer"], moon["check"]["options"])

    def test_individual_moons_match_full_response(self):
        for system in self.client.get("/api/systems").json():
            detail = self.client.get(f"/api/systems/{system['id']}")
            self.assertEqual(detail.status_code, 200)
            moons = [moon for orbit in detail.json()["orbits"] for moon in orbit["moons"]]
            self.assertEqual(len(moons), system["moon_count"])
            for moon in moons:
                with self.subTest(planet=system["id"], moon=moon["id"]):
                    response = self.client.get(f"/api/systems/{system['id']}/moons/{moon['id']}")
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
