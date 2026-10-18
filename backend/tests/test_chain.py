import json
from pathlib import Path
import unittest

from fastapi.testclient import TestClient

from backend.src.chain import canonical, genesis_hash, moon_hash, sha256
from backend.src.content_data import SYSTEMS
from backend.src.main import app

VECTORS = json.loads((Path(__file__).resolve().parents[2] / "shared" / "hash_vectors.json").read_text(encoding="utf-8"))


def all_moons(planet: dict) -> list[dict]:
    return [moon for orbit in planet["orbits"] for moon in orbit["moons"]]


class HashRuleTests(unittest.TestCase):
    def test_canonical_vectors(self):
        for case in VECTORS["canonical"]:
            with self.subTest(case["name"]):
                self.assertEqual(canonical(case["input"]), case["canonical"])
                self.assertEqual(sha256(case["canonical"]), case["sha256"])

    def test_chain_vector(self):
        example = VECTORS["chain"]
        prev = sha256(canonical(example["star"]))
        self.assertEqual(prev, example["genesis"])
        for moon in example["moons"]:
            prev = moon_hash(prev, moon["title"], moon["body"])
            self.assertEqual(prev, moon["hash"])


class SealTests(unittest.TestCase):
    def setUp(self):
        self.client = self.enterContext(TestClient(app))

    def test_blockchain_moons_link_to_the_previous_record(self):
        planet = self.client.get("/api/systems/blockchain").json()
        self.assertTrue(planet["chain"])
        self.assertEqual(planet["star"]["hash"], genesis_hash(SYSTEMS["blockchain"]))
        prev = planet["star"]["hash"]
        for moon in all_moons(planet):
            with self.subTest(moon=moon["id"]):
                self.assertEqual(moon["prev_hash"], prev)
                self.assertEqual(moon["hash"], moon_hash(prev, moon["title"], moon["body"]))
                self.assertRegex(moon["hash"], r"^[0-9a-f]{64}$")
            prev = moon["hash"]

    def test_planets_without_a_chain_are_not_hashed(self):
        for planet_id in ("dijkstra", "sorting", "binary-search"):
            with self.subTest(planet=planet_id):
                planet = self.client.get(f"/api/systems/{planet_id}").json()
                self.assertFalse(planet["chain"])
                self.assertIsNone(planet["star"]["hash"])
                self.assertTrue(all(moon["hash"] is None for moon in all_moons(planet)))


class VerifyTests(unittest.TestCase):
    def setUp(self):
        self.client = self.enterContext(TestClient(app))
        self.moons = all_moons(self.client.get("/api/systems/blockchain").json())

    def verify(self, body: dict):
        return self.client.post("/api/systems/blockchain/verify", json=body)

    def validity(self, result: dict) -> list[bool]:
        return [moon["valid"] for moon in result["moons"]]

    def test_no_edits_keeps_every_record(self):
        response = self.verify({})
        self.assertEqual(response.status_code, 200)
        result = response.json()
        self.assertIsNone(result["first_broken"])
        self.assertEqual([(m["id"], m["hash"]) for m in result["moons"]],
                         [(m["id"], m["hash"]) for m in self.moons])
        self.assertTrue(all(self.validity(result)))

    def test_editing_a_moon_breaks_it_and_every_later_moon(self):
        for index in (0, 1, len(self.moons) - 1):
            moon = self.moons[index]
            with self.subTest(moon=moon["id"]):
                result = self.verify({"edits": {moon["id"]: moon["body"].replace("3", "8", 1) + " Edited."}}).json()
                self.assertEqual(result["first_broken"], moon["id"])
                self.assertEqual(self.validity(result), [i < index for i in range(len(self.moons))])

    def test_whitespace_only_changes_keep_the_chain_valid(self):
        moon = self.moons[0]
        reformatted = "\n" + moon["body"].replace("\n", "  \r\n") + "\t\r\n\r\n"
        result = self.verify({"edits": {moon["id"]: reformatted}}).json()
        self.assertIsNone(result["first_broken"])

    def test_restoring_the_original_text_repairs_the_chain(self):
        moon = self.moons[2]
        result = self.verify({"edits": {moon["id"]: moon["body"]}}).json()
        self.assertTrue(all(self.validity(result)))

    def test_errors(self):
        for url, body, status, code in [
            ("/api/systems/missing/verify", {}, 404, "system_not_found"),
            ("/api/systems/blockchain/verify", {"edits": {"missing": "x"}}, 404, "moon_not_found"),
            ("/api/systems/dijkstra/verify", {}, 409, "chain_disabled"),
        ]:
            with self.subTest(url=url, code=code):
                response = self.client.post(url, json=body)
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.json()["error"]["code"], code)

    def test_oversized_edits_are_rejected(self):
        response = self.verify({"edits": {self.moons[0]["id"]: "x" * 20_001}})
        self.assertEqual(response.status_code, 422)

    def test_verify_route_is_documented(self):
        paths = self.client.get("/openapi.json").json()["paths"]
        self.assertIn("post", paths["/api/systems/{system_id}/verify"])


if __name__ == "__main__":
    unittest.main()
