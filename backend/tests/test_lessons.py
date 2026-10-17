"""Content integrity plus independent checks of the worked educational examples."""

import bisect
import itertools
import re
import unittest

from backend.src.content_data import SYSTEMS
from backend.src.schemas import TutorRequest
from backend.src.tutor import build_system_prompt


def get_moon(system_id, moon_id):
    return next(moon for orbit in SYSTEMS[system_id].orbits for moon in orbit.moons if moon.id == moon_id)


def authored_functions(system_id, moon_ids):
    functions = {}
    for moon_id in moon_ids:
        for snippet in re.findall(r"```python\n(.*?)\n```", get_moon(system_id, moon_id).body, re.S):
            # These snippets are trusted, repository-authored educational examples.
            exec(compile(snippet, f"lesson:{moon_id}", "exec"), functions)
    return functions


class LessonIntegrityTests(unittest.TestCase):
    def test_structure_and_links(self):
        for system in SYSTEMS.values():
            moons = [moon for orbit in system.orbits for moon in orbit.moons]
            ids = {moon.id for moon in moons}
            self.assertEqual(len(ids), len(moons), system.id)
            self.assertEqual([orbit.number for orbit in system.orbits], list(range(1, len(system.orbits) + 1)))
            for orbit in system.orbits:
                self.assertEqual([moon.order for moon in orbit.moons], list(range(1, len(orbit.moons) + 1)))
                for moon in orbit.moons:
                    with self.subTest(planet=system.id, lesson=moon.id):
                        self.assertEqual(moon.orbit, orbit.number)
                        self.assertEqual([step.id for step in moon.dialogue_steps], [f"step-{i}" for i in range(1, 6)])
                        self.assertEqual(moon.body, "\n\n".join(f"## {step.title}\n{step.body}" for step in moon.dialogue_steps))
                        links = set(re.findall(r"\[\[([a-z0-9-]+)\]\]", moon.body))
                        self.assertEqual(set(moon.links), links)
                        self.assertTrue(links <= ids, links - ids)
                        self.assertEqual(len(moon.check.options), 3)
                        self.assertEqual(moon.check.options.count(moon.check.answer), 1)
                        self.assertGreaterEqual(len(moon.suggested), 2)
                        # Avoid accidentally publishing empty stubs or promised widgets that do not exist.
                        self.assertGreater(len(moon.body.split()), 140)
                        self.assertIsNone(moon.widget)
                        self.assertNotIn("TODO", moon.body)

    def test_tutor_can_use_every_lesson_and_linked_context(self):
        for system in SYSTEMS.values():
            for orbit in system.orbits:
                for moon in orbit.moons:
                    with self.subTest(planet=system.id, lesson=moon.id):
                        request = TutorRequest(system=system.id, moon_id=moon.id,
                                               messages=[{"role": "user", "content": "Explain this lesson"}])
                        prompt = build_system_prompt(request)
                        self.assertIn(moon.goal, prompt)
                        self.assertIn(moon.body, prompt)
                        for link in moon.links:
                            self.assertIn(get_moon(system.id, link).body, prompt)

    def test_checkpoint_positions_are_not_always_the_first_option(self):
        for system in SYSTEMS.values():
            positions = {moon.check.options.index(moon.check.answer) for orbit in system.orbits for moon in orbit.moons}
            self.assertEqual(positions, {0, 1, 2})


class WorkedExampleTests(unittest.TestCase):
    def test_authored_binary_search_code_on_boundaries_and_duplicates(self):
        functions = authored_functions("binary-search", ("termination-and-code", "duplicate-boundaries"))
        for length in range(7):
            for values in itertools.combinations_with_replacement(range(-2, 3), length):
                for target in range(-3, 4):
                    index = functions["binary_search"](values, target)
                    self.assertEqual(index != -1, target in values)
                    if index != -1:
                        self.assertEqual(values[index], target)
                    self.assertEqual(functions["lower_bound"](values, target), bisect.bisect_left(values, target))

    def test_shortest_path_numbers_in_authored_graph(self):
        example = get_moon("dijkstra", "graphs-and-paths").dialogue_steps[2].body
        edges = [(u, v, int(cost)) for u, v, cost in re.findall(r"([A-E])→([A-E]):(-?\d+)", example)]
        self.assertEqual(len(edges), 7)

        def cheapest_routes(links):
            # Enumerate simple routes independently of Dijkstra's queue/settlement logic.
            best = {"A": 0}
            def walk(u, cost, visited):
                for source, target, weight in links:
                    if source == u and target not in visited:
                        total = cost + weight
                        best[target] = min(best.get(target, float("inf")), total)
                        walk(target, total, visited | {target})
            walk("A", 0, {"A"})
            return best

        self.assertEqual(cheapest_routes(edges), {"A": 0, "B": 3, "C": 1, "D": 4, "E": 7})
        changed = [edge for edge in edges if edge[:2] != ("B", "D")]
        self.assertEqual(cheapest_routes(changed)["E"], 9)
        self.assertEqual(get_moon("dijkstra", "worked-shortest-path").check.answer, "7")
        self.assertTrue(get_moon("dijkstra", "ospf-convergence").check.answer.startswith("9 "))

        functions = authored_functions("dijkstra", ("priority-queue",))
        graph = {vertex: [] for vertex in "ABCDF"}  # E is deliberately only a destination.
        for source, target, weight in edges:
            graph.setdefault(source, []).append((target, weight))
        distances, parents = functions["dijkstra"](graph, "A")
        self.assertEqual({v: distances[v] for v in "ABCDE"}, cheapest_routes(edges))
        self.assertEqual(distances["F"], float("inf"))
        route = ["E"]
        while route[-1] != "A":
            route.append(parents[route[-1]])
        self.assertEqual(route[::-1], ["A", "C", "B", "D", "E"])
        with self.assertRaises(ValueError):
            functions["dijkstra"]({"A": [("B", -1)]}, "A")

    def test_authored_sorting_code_preserves_records_and_sorts(self):
        functions = authored_functions("sorting", ("bubble-sort", "insertion-sort", "merging", "merge-sort", "quicksort"))
        for length in range(6):
            for values in itertools.product((-1, 0, 1), repeat=length):
                for name in ("bubble_sort", "insertion_sort", "merge_sort", "quicksort"):
                    original = list(values)
                    result = functions[name](original)
                    self.assertEqual(result, sorted(values), (name, values))
                    if name in ("bubble_sort", "insertion_sort"):
                        self.assertIs(result, original)
                    else:
                        self.assertEqual(original, list(values))

    def test_stability_promised_by_bubble_insertion_and_merge(self):
        class Record:
            def __init__(self, key, name):
                self.key, self.name = key, name

            def __gt__(self, other):
                return self.key > other.key

            def __le__(self, other):
                return self.key <= other.key

        functions = authored_functions("sorting", ("bubble-sort", "insertion-sort", "merging", "merge-sort"))
        for name in ("bubble_sort", "insertion_sort", "merge_sort"):
            records = [Record(2, "A"), Record(1, "X"), Record(2, "B")]
            self.assertEqual([record.name for record in functions[name](records)], ["X", "A", "B"])
