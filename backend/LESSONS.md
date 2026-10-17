# Nova learning paths

48 lessons across 12 ordered chapters, with five dialogue steps per lesson.
The content is authored for beginners, with explanations, numerical traces,
misconceptions, boundaries, and a checkpoint that tests the learning goal.
Each lesson is roughly 200–350 words; steps containing runnable examples are longer.

## Blockchain — 16 lessons

1. **Foundations:** Ledgers; Hashing; Avalanche effect; Digital signatures.
2. **The chain:** Blocks; Previous hash; Tamper detection; Merkle trees.
3. **Mining:** Why rewriting must cost something; Nonce; Proof of work; Difficulty and rewards.
4. **Consensus:** Nodes; Forks and chain selection; Double spending and majority attacks; Proof of stake.

The story moves from an editable notebook to commitments and authorisation,
then separates chain consistency, resource cost, validation, and network agreement.
Examples distinguish a simplified lesson hash chain from actual Bitcoin block
encoding. Chain selection uses accumulated work rather than unqualified block
count. Proof-of-stake material identifies protocol-specific rules instead of
presenting it as a nonce race with a different name.

## Dijkstra & OSPF — 12 lessons

1. **Model the route map:** Graphs and paths; Path costs and the objective;
   Tentative distances; Edge relaxation.
2. **Run and explain Dijkstra:** Greedy settlement; Priority queue and stale entries;
   A complete shortest-path trace; Reconstructing a path.
3. **Limits and real networks:** Why weights must be nonnegative; Time, memory,
   and graph representation; OSPF and the shared topology map; Failures,
   convergence, and equal-cost routes.

One directed example is reused throughout, avoiding contradictory route costs
between lessons. Its shortest A-to-E route costs 7; removing B→D changes that
cost to 9. A separate negative-edge example explains the failed settlement
assumption. The heap lesson contains runnable Python and explicitly handles
stale entries, destination-only vertices, and unreachable vertices.

The OSPF section separates topology dissemination from local shortest-path
calculation and discusses convergence and equal-cost multipath.

## Sorting — 12 lessons

1. **Order and local swaps:** What sorting must preserve; Comparisons and keys;
   Bubble sort; Bubble sort correctness and cost.
2. **Build from sorted pieces:** Insertion sort; Stable sorting and ties;
   Merge sort; The merge operation.
3. **Partitions and trade-offs:** Quicksort; Partition boundaries and duplicates;
   Complexity and lower bounds; Choose, verify, and explain a sort.

Lessons test both sortedness and record preservation. Bubble and insertion traces
establish invariants before complexity is discussed. Equal keys have explicit
identities when stability matters. Merge sort uses the linked merge helper;
the quicksort example deliberately allocates new partitions and is described
accordingly. The comparison-model lower bound is distinguished from methods
that exploit integer-key structure. Runnable code is included for the four
sorts and merging, with mutation behaviour explained.

## Binary Search — 8 lessons

1. **Find a target safely:** An ordered search space; The candidate interval;
   A complete search trace; Correct updates and termination.
2. **Boundaries, costs, and applications:** Duplicates and lower bounds;
   Insertion points and edge cases; Complexity and practical trade-offs;
   Binary search on a monotone answer.

Array examples consistently use zero-based indices and half-open [lo,hi)
intervals. Exact lookup, lower bound, and upper bound have distinct meanings.
The final lesson explicitly changes to inclusive capacity bounds for a first-feasible
answer problem. Search complexity includes access and preprocessing assumptions,
and the cost of a feasibility predicate. Both complete Python search examples
are checked against duplicates, missing keys, extremes, and empty arrays.

## Content and API contract

- `src/lessons/` holds the authored content; `src/content_data.py` exports it.
- `body` is assembled from `dialogue_steps`, so tutor and reading content agree.
- `links` is derived from `[[moon-id]]` references; tests reject missing targets.
- Existing `ledgers`, `hashing`, and the other planned Blockchain IDs are retained.
- Checkpoint answers remain public for client grading, as agreed for the hackathon.
- Widget names are not advertised until widgets are integrated; lessons work as reading and checkpoints.
- Content uses the existing API routes and schemas. Frontend types are generated from OpenAPI.
- The connected frontend fetches these paths and uses the team's shared canvas and concept page.
- The ledger and hashing scenes accompany authored content; their checkpoints come from the API.

## Verification

Run `backend/.venv/bin/python -m unittest discover -s backend/tests -v` from the
repository root. Tests cover all 48 individual lesson endpoints, full planet
responses, checkpoints, ordering, references, tutor context, the worked graph,
the exact authored Python snippets, sorting stability, and package startup.

## Primary references for technical review

Explanations, examples, questions, and code are authored for Nova rather than
copied lesson text. These references support review of the technical concepts:

- [Bitcoin developer guide: block chain](https://developer.bitcoin.org/devguide/block_chain.html) — block commitments, work and competing histories.
- [Ethereum: proof of stake](https://ethereum.org/en/developers/docs/consensus-mechanisms/pos/) — validator participation, voting and penalties.
- [MIT 6.006: Dijkstra's algorithm](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/mit6_006s20_lec13/) — the nonnegative-weight shortest-path argument and queue trade-offs.
- [OSPFv2, RFC 2328](https://www.rfc-editor.org/rfc/rfc2328.html) — link-state databases, shortest-path trees, areas and equal-cost routes.
- [MIT 6.006 lecture notes](https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/resources/lecture-notes/) — sorting, heaps, and graph algorithm foundations.
- [Python sorting documentation](https://docs.python.org/3/howto/sorting.html) — keys and stable ordering.
- [Python bisect documentation](https://docs.python.org/3/library/bisect.html) — insertion boundaries and search-versus-insertion costs.
