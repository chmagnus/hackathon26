"""A chain-enabled planet's lessons form a real SHA-256 hash chain.

The star introduction is the genesis record. Each moon's hash covers the previous
record's hash plus its own title and body, walking orbit 1 to the last orbit in
order. Editing an early lesson therefore changes every later hash.

Text is canonicalised first so line endings and trailing spaces never break the
chain: CRLF/CR become LF, spaces and tabs are stripped from line ends, and
leading/trailing newlines are removed. shared/hash_vectors.json pins these rules
for other implementations.
"""

import hashlib

from .schemas import MoonStatus, StarSystem, VerifyResult


def canonical(text: str) -> str:
    lines = text.replace("\r\n", "\n").replace("\r", "\n").split("\n")
    return "\n".join(line.rstrip(" \t") for line in lines).strip("\n")


def sha256(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def genesis_hash(system: StarSystem) -> str:
    return sha256(canonical(system.star.body))


def moon_hash(prev_hash: str, title: str, body: str) -> str:
    return sha256(f"{prev_hash}{canonical(title)}\n{canonical(body)}")


def seal(system: StarSystem) -> StarSystem:
    """Return a copy with record hashes filled in; planets without a chain are unchanged."""
    if not system.chain:
        return system
    prev = genesis_hash(system)
    star = system.star.model_copy(update={"hash": prev})
    orbits = []
    for orbit in system.orbits:
        moons = []
        for moon in orbit.moons:
            digest = moon_hash(prev, moon.title, moon.body)
            moons.append(moon.model_copy(update={"prev_hash": prev, "hash": digest}))
            prev = digest
        orbits.append(orbit.model_copy(update={"moons": moons}))
    return system.model_copy(update={"star": star, "orbits": orbits})


def verify(system: StarSystem, edits: dict[str, str]) -> VerifyResult:
    """Recompute a sealed chain with edited bodies and compare each moon to its record.

    Nothing forces later moons to fail: an edit changes that moon's hash, which is
    the next moon's input, so the break spreads through the chain on its own.
    """
    prev = genesis_hash(system)
    statuses = []
    for moon in (moon for orbit in system.orbits for moon in orbit.moons):
        prev = moon_hash(prev, moon.title, edits.get(moon.id, moon.body))
        statuses.append(MoonStatus(id=moon.id, hash=prev, valid=prev == moon.hash))
    first_broken = next((status.id for status in statuses if not status.valid), None)
    return VerifyResult(first_broken=first_broken, moons=statuses)
