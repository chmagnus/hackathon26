"""Small lesson fixture for the first content API feature.

Add Markdown loading later. Dialogue steps are the source for each full body,
so the tutor and dialogue UI receive the same lesson text.
"""

from .schemas import Check, DialogueStep, Moon, Orbit, Star, StarSystem


def lesson_body(steps: list[DialogueStep]) -> str:
    return "\n\n".join(f"## {step.title}\n{step.body}" for step in steps)


ledger_steps = [
    DialogueStep(
        id="step-1", title="A shared record",
        body="A ledger is a record of transactions. Imagine Alice and Bob recording their payments in a shared notebook: Alice pays Bob five tokens.",
    ),
    DialogueStep(
        id="step-2", title="What if someone edits the past?",
        body="Someone could change that old payment from five tokens to fifty. A plain editable notebook does not tell later readers what the entry originally said.",
    ),
    DialogueStep(
        id="step-3", title="We need a way to detect changes",
        body="A shared history needs a way to reveal edits. Next, explore [[hashing]] to learn how a digital fingerprint can help detect a change.",
    ),
]

hashing_steps = [
    DialogueStep(
        id="step-1", title="A digital fingerprint",
        body="A hash function takes data and produces a fixed-length fingerprint. SHA-256 produces a 256-bit value, usually shown as 64 hexadecimal characters.",
    ),
    DialogueStep(
        id="step-2", title="Same input, same fingerprint",
        body="Hash exactly the same text twice and you get the same result. Changing the text produces a different-looking fingerprint. Different computers can compare their results.",
    ),
    DialogueStep(
        id="step-3", title="Compare with a trusted record",
        body="To detect a change in a [[ledgers]] entry, hash it again and compare the result with its trusted original fingerprint. A hash alone does not prevent someone replacing both the text and the stored fingerprint.",
    ),
]

BLOCKCHAIN = StarSystem(
    id="blockchain",
    title="Blockchain",
    colour="#6ff2c5",
    # This feature serves lessons only. Enable the chain when verification exists.
    chain=False,
    star=Star(body="How can people agree on a shared record? Start with Ledgers, then explore Hashing."),
    orbits=[Orbit(number=1, title="Foundations", moons=[
        Moon(
            id="ledgers", title="Ledgers",
            summary="A shared record needs a way to reveal changes to its past.",
            goal="Explain why an editable ledger needs tamper detection.",
            body=lesson_body(ledger_steps), orbit=1, order=1,
            dialogue_steps=ledger_steps, links=["hashing"],
            suggested=["Why is an ordinary shared notebook not enough?"],
            check=Check(
                question="What is a risk when anyone can silently edit an old ledger entry?",
                options=["Past transactions can be rewritten", "The ledger cannot store numbers", "Every payment becomes encrypted"],
                answer="Past transactions can be rewritten",
            ),
        ),
        Moon(
            id="hashing", title="Hashing",
            summary="A hash is a fixed-length fingerprint of data.",
            goal="Recognise that identical inputs produce identical hashes.",
            body=lesson_body(hashing_steps), orbit=1, order=2,
            dialogue_steps=hashing_steps, links=["ledgers"],
            suggested=["Does a hash prevent someone editing a file?"],
            check=Check(
                question="What does SHA-256 produce for exactly the same input each time?",
                options=["The same hash", "A randomly chosen hash", "The original text"],
                answer="The same hash",
            ),
        ),
    ])],
)

# Dictionary lookup keeps URL parameters out of filesystem paths.
SYSTEMS: dict[str, StarSystem] = {BLOCKCHAIN.id: BLOCKCHAIN}
