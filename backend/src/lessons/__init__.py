"""Content helpers: assemble authored lessons into the existing API models."""

import re

from ..schemas import Check, DialogueStep, Moon, Orbit, Star, StarSystem


def lesson(id, title, summary, goal, steps, question, options, answer, suggested):
    dialogue = [DialogueStep(id=f"step-{index}", title=heading, body=text.strip())
                for index, (heading, text) in enumerate(steps, 1)]
    body = "\n\n".join(f"## {step.title}\n{step.body}" for step in dialogue)
    return dict(
        id=id, title=title, summary=summary, goal=goal, body=body,
        dialogue_steps=dialogue, links=list(dict.fromkeys(re.findall(r"\[\[([a-z0-9-]+)\]\]", body))),
        check=Check(question=question, options=options, answer=answer),
        suggested=suggested,
    )


def orbit(number, title, lessons):
    return Orbit(number=number, title=title, moons=[
        Moon(**content, orbit=number, order=index)
        for index, content in enumerate(lessons, 1)
    ])


def planet(id, title, colour, intro, orbits):
    # Content-only release: do not advertise hash verification or unbuilt widgets.
    return StarSystem(id=id, title=title, colour=colour, chain=False,
                      star=Star(body=intro), orbits=orbits)
