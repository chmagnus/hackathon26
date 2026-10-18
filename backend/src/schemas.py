
"""Learning-content API models shared by the content and tutor backends.

Keep the agreed system/star API names: a system is a planet and its star field
contains the planet introduction. Coordinate field changes with the frontend.
"""

from pydantic import BaseModel, Field, model_validator
from typing import Annotated, Literal




class Check(BaseModel):
    """One multiple-choice checkpoint, graded by the frontend."""

    question: str = Field(min_length=1)
    options: list[str] = Field(min_length=2)
    answer: str

    @model_validator(mode="after")
    def validate_options(self):
        if len(set(self.options)) != len(self.options):
            raise ValueError("Checkpoint options must be unique")
        if self.answer not in self.options:
            raise ValueError("Checkpoint answer must match an option")
        return self


class DialogueStep(BaseModel):
    """One readable dialogue box; array order determines Next/Back navigation."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    body: str = Field(min_length=1)


class Moon(BaseModel):
    """One concept, its ordered dialogue, and its completion checkpoint."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    summary: str = Field(min_length=1)
    goal: str = Field(min_length=1)
    body: str = Field(min_length=1)
    orbit: int = Field(ge=1)
    order: int = Field(ge=1)
    dialogue_steps: list[DialogueStep] = Field(min_length=1)
    check: Check
    widget: str | None = None
    links: list[str] = Field(default_factory=list)
    suggested: list[str] = Field(default_factory=list)
    hash: str | None = None
    prev_hash: str | None = None
    nonce: int = Field(default=0, ge=0)


class Orbit(BaseModel):
    number: int = Field(ge=1)
    title: str = Field(min_length=1)
    moons: list[Moon] = Field(min_length=1)


class Star(BaseModel):
    """Planet introduction, also the genesis record for a chain-enabled planet."""

    body: str = Field(min_length=1)
    hash: str | None = None


class StarSystem(BaseModel):
    """Full planet response, retaining the team's agreed schema name."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    colour: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    chain: bool = False
    star: Star
    orbits: list[Orbit] = Field(min_length=1)


class SystemSummary(BaseModel):
    """Small home-screen response; moon_count comes from loaded lessons."""

    id: str = Field(min_length=1)
    title: str = Field(min_length=1)
    colour: str = Field(pattern=r"^#[0-9a-fA-F]{6}$")
    moon_count: int = Field(ge=0)


class VerifyRequest(BaseModel):
    """Proposed lesson edits to check against a planet's hash chain; nothing is saved."""

    edits: dict[str, Annotated[str, Field(max_length=20_000)]] = Field(
        default_factory=dict, max_length=64,
        description="Moon ID mapped to a replacement lesson body.",
    )
    nonces: dict[str, Annotated[int, Field(ge=0)]] = Field(
        default_factory=dict, max_length=64,
        description="Reserved for the mining step; not yet part of the hash.",
    )


class MoonStatus(BaseModel):
    id: str
    hash: str
    valid: bool


class VerifyResult(BaseModel):
    """Recomputed hashes in chain order; first_broken is the first moon that no longer matches."""

    first_broken: str | None
    moons: list[MoonStatus]


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(min_length=1, max_length=2000)


class WidgetEvent(BaseModel):
    type: str
    data: dict
    at: float


class TutorRequest(BaseModel):
    system: str
    moon_id: str
    messages: list[ChatMessage] = Field(min_length=1, max_length=20)
    completed: list[str] = []
    widget_events: list[WidgetEvent] = []
