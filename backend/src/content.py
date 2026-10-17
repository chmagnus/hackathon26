"""Load trusted repository content once; no request paths are used as file paths."""

import re
import warnings
from functools import lru_cache
from pathlib import Path

import yaml
from pydantic import BaseModel, ConfigDict, Field, ValidationError

from .chain import seal
from .schemas import Check, DialogueStep, Moon, Orbit, Star, StarSystem

CONTENT_ROOT = Path(__file__).resolve().parents[2] / "algorithms"
ID = r"[a-z0-9]+(?:-[a-z0-9]+)*"
LINK = re.compile(r"\[\[([^\[\]\n]+)\]\]")
KNOWN_WIDGETS = {"hash-playground", "block-inspector", "chain-view", "mining-race", "fork-simulator", "sign-verify", "merkle-view"}


class MoonMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)
    id: str = Field(pattern=f"^{ID}$")
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1, pattern=r"^[^\r\n]+$")
    goal: str = Field(min_length=1)
    widget: str | None = None
    check: Check
    suggested: list[str] = Field(default_factory=list)


class OrbitMetadata(BaseModel):
    number: int = Field(gt=0)
    title: str = Field(min_length=1)


class PlanetMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")
    id: str = Field(pattern=f"^{ID}$")
    title: str = Field(min_length=1)
    colour: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    chain: bool = False
    orbits: list[OrbitMetadata] = Field(min_length=1)


def dialogue_steps(body: str, title: str) -> list[DialogueStep]:
    """Each level-two Markdown heading starts a box; fenced code stays intact."""
    sections: list[tuple[str, str]] = []
    heading, lines = title, []
    fence = None
    for line in body.splitlines():
        marker = re.match(r"^ {0,3}(`{3,}|~{3,})", line)
        if marker:
            token = marker[1]
            if fence is None:
                fence = token
            elif token[0] == fence[0] and len(token) >= len(fence):
                fence = None
        match = re.match(r"^##\s+(.+?)\s*$", line) if fence is None and not marker else None
        if match:
            text = "\n".join(lines).strip()
            if text:
                sections.append((heading, text))
            elif lines or heading != title:
                raise ValueError("Dialogue sections must contain text")
            heading, lines = match[1], []
        else:
            lines.append(line)
    text = "\n".join(lines).strip()
    if not text:
        raise ValueError("Moon body and dialogue sections must contain text")
    sections.append((heading, text))
    return [DialogueStep(id=f"step-{index}", title=name, body=text) for index, (name, text) in enumerate(sections, 1)]


def read_moon(path: Path, orbit: int, order: int) -> Moon:
    raw = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    match = re.match(r"\A---\n(.*?)\n---[ \t]*\n(.*)\Z", raw, re.S)
    if not match:
        raise ValueError("Moon requires YAML frontmatter between --- lines")
    metadata = MoonMetadata.model_validate(yaml.safe_load(match[1]))
    body = match[2].strip()
    if metadata.widget and metadata.widget not in KNOWN_WIDGETS:
        warnings.warn(f"{path}: unregistered widget {metadata.widget!r}", stacklevel=2)
    return Moon(
        **metadata.model_dump(), body=body, orbit=orbit, order=order,
        dialogue_steps=dialogue_steps(body, metadata.title),
        links=list(dict.fromkeys(LINK.findall(body))),
    )


def load_content(root: Path = CONTENT_ROOT) -> dict[str, StarSystem]:
    systems = {}
    if not root.is_dir():
        raise ValueError(f"Content directory does not exist: {root}")
    for folder in sorted(path for path in root.iterdir() if path.is_dir() and not path.name.startswith(".")):
        try:
            config = PlanetMetadata.model_validate(yaml.safe_load((folder / "system.yaml").read_text(encoding="utf-8")))
            if config.id != folder.name or config.id in {"api", "data"}:
                raise ValueError("Planet ID must match its folder and must not be api or data")
            numbers = [orbit.number for orbit in config.orbits]
            if len(set(numbers)) != len(numbers):
                raise ValueError("Duplicate orbit number")
            directories = {}
            for directory in sorted(folder.glob("orbit-*")):
                match = re.fullmatch(r"orbit-(\d+)-.+", directory.name)
                if not match or not directory.is_dir():
                    raise ValueError(f"Invalid orbit folder: {directory.name}")
                number = int(match[1])
                if number in directories or number not in numbers:
                    raise ValueError(f"Duplicate or undeclared orbit folder: {directory.name}")
                directories[number] = directory
            orbits = []
            for orbit in sorted(config.orbits, key=lambda item: item.number):
                directory = directories.get(orbit.number)
                files = list(directory.glob("*.md")) if directory else []
                if not files:
                    raise ValueError(f"Orbit {orbit.number} has no moons")
                ordered = []
                for path in files:
                    match = re.fullmatch(r"(\d+)-.+\.md", path.name)
                    if not match:
                        raise ValueError(f"Moon filename needs a numeric prefix: {path.name}")
                    ordered.append((int(match[1]), path))
                if len({number for number, _ in ordered}) != len(ordered):
                    raise ValueError(f"Duplicate moon order in orbit {orbit.number}")
                moons = [read_moon(path, orbit.number, index) for index, (_, path) in enumerate(sorted(ordered), 1)]
                orbits.append(Orbit(number=orbit.number, title=orbit.title, moons=moons))
            moons = [moon for orbit in orbits for moon in orbit.moons]
            ids = {moon.id for moon in moons}
            if len(ids) != len(moons):
                raise ValueError("Duplicate moon ID within planet")
            intro = (folder / "star.md").read_text(encoding="utf-8").strip()
            if not intro:
                raise ValueError("Planet introduction must contain text")
            for origin, text in [("intro", intro), *((moon.id, moon.body) for moon in moons)]:
                missing = set(LINK.findall(text)) - ids
                if missing:
                    raise ValueError(f"{origin}: links to missing moons: {sorted(missing)}")
            systems[config.id] = seal(StarSystem(
                id=config.id, title=config.title, colour=config.colour,
                chain=config.chain, star=Star(body=intro), orbits=orbits,
            ))
        except (OSError, ValueError, ValidationError, yaml.YAMLError) as exc:
            raise ValueError(f"Invalid content in {folder}: {exc}") from exc
    if not systems:
        raise ValueError("At least one planet is required")
    return systems


@lru_cache(maxsize=1)
def get_content() -> dict[str, StarSystem]:
    return load_content()
