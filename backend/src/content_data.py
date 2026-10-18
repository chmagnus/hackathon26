"""Authored learning paths, exported under the existing content/tutor contract."""

from .chain import seal
from .lessons.binary_search import BINARY_SEARCH
from .lessons.blockchain import BLOCKCHAIN
from .lessons.dijkstra import DIJKSTRA
from .lessons.sorting import SORTING
from .schemas import StarSystem

SYSTEMS: dict[str, StarSystem] = {
    system.id: seal(system) for system in (BLOCKCHAIN, DIJKSTRA, SORTING, BINARY_SEARCH)
}
