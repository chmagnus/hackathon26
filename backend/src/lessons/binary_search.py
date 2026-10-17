"""Search and boundary-finding with explicit half-open interval conventions."""

from . import lesson, orbit, planet

BINARY_SEARCH = planet(
    "binary-search", "Binary Search", "#ff8a7a",
    "A sorted navigation catalogue lets you rule out half the remaining candidates with one "
    "comparison. Learn why that elimination is safe, trace a search, and write a loop that "
    "cannot get stuck. Then handle duplicates, insertion points, and monotone decision problems. "
    "All array indices are zero-based. The main examples use the half-open candidate interval "
    "[lo, hi): lo is included and hi is excluded.",
    [
        orbit(1, "Find a target safely", [
            lesson("sorted-search-space", "An ordered search space",
                "Binary search needs an order or monotone condition that justifies eliminating a region.",
                "Explain the precondition that makes a midpoint comparison informative.", [
                    ("Why linear search needs more checks", "In an arbitrary list, inspecting one item usually tells you nothing about the uninspected ones. The target could be anywhere. A linear search may need to inspect every element to find it or establish that it is absent."),
                    ("Use the sorted promise", "In ascending [3,8,12,17,25,31,42], a comparison with the middle value 17 gives information about a whole region. A target larger than 17 cannot occur at or before that middle index, because all those values are at most 17."),
                    ("Do not guess on unsorted data", "For [25,3,42,8,17], seeing a middle value of 42 does not prove a target 25 lies to its left. Binary search can silently return a wrong result if the ordering precondition is false. It is not a faster drop-in replacement for every scan."),
                    ("Keep the comparison consistent", "The search must use the same key and ordering that produced the sorted sequence. Numeric sorting followed by text comparisons can make the elimination argument false. If another process changes the sequence during the search, the original precondition may also stop holding."),
                    ("Look for the general pattern", "The deeper idea is a monotone search space: a comparison separates candidates that cannot work from candidates that still might. [[search-interval]] makes those candidates explicit. Later, [[binary-search-on-answers]] applies the same idea without searching for an equal array item."),
                ], "What makes it safe to discard half of an ascending array after a midpoint comparison?",
                ["The target is guaranteed to exist", "The ordering constrains every value in the discarded region", "The array length must be a power of two"],
                "The ordering constrains every value in the discarded region", ["Why does binary search fail on unsorted input?", "Must the target be present?"]),
            lesson("search-interval", "The candidate interval",
                "Half-open boundaries describe exactly which indices remain under consideration.",
                "Maintain [lo, hi) without mixing it with inclusive-boundary formulas.", [
                    ("Choose one convention", "Use the half-open interval [lo,hi): include lo and exclude hi. Initially lo=0 and hi=n, covering every valid index from 0 to n-1. The value hi is allowed to equal n, but a[hi] is not a valid access in that case."),
                    ("Find the midpoint", "While lo < hi, choose mid = lo + (hi-lo)//2. Then lo <= mid < hi, so the midpoint is a valid candidate index. The subtraction form also avoids overflowing lo+hi in fixed-width integer languages; Python integers do not have that same overflow issue."),
                    ("Discard safely", "If a[mid] < target, discard everything through mid by setting lo=mid+1. If a[mid] > target, discard mid and everything above it by setting hi=mid. If equal, an exact-match search may return mid. Each inequality relies on the ascending-order promise."),
                    ("Understand the empty case", "When lo equals hi, the interval contains no candidate indices. This naturally handles an empty array, where both begin at 0. You should exit before accessing a[mid], rather than constructing an artificial midpoint for an empty interval."),
                    ("Avoid mixing recipes", "Inclusive [lo,hi] searches use different initial values, loop tests, and upper updates. Both conventions can be correct. Bugs arise when hi=n from one version is combined with while lo<=hi or hi=mid-1 from another. Next, [[binary-search-trace]] follows one consistent version."),
                ], "For the half-open interval [2,5), which indices are candidates?",
                ["2, 3, and 4", "2, 3, 4, and 5", "3, 4, and 5"], "2, 3, and 4",
                ["Why is hi allowed to equal the array length?", "Why does lo=mid risk a stuck loop?"]),
            lesson("binary-search-trace", "A complete search trace",
                "Trace indices and discarded regions rather than guessing how many halvings occur.",
                "Find a present target and identify an absent target using half-open bounds.", [
                    ("Set the input", "Search [3,8,12,17,25,31,42] for 25. Indices run from 0 to 6. Start lo=0, hi=7. The midpoint is 3 and a[3]=17. Because 17<25, set lo=4; indices 0 through 3 cannot contain the target."),
                    ("Narrow again", "Now search [4,7). The midpoint is 5 and a[5]=31. Because 31>25, set hi=5. Only [4,5) remains, containing index 4. Its midpoint is 4, where a[4]=25, so return index 4."),
                    ("Try a missing target", "Searching the same array for 26 begins similarly. After comparing 17 and 31, examine index 4 with value 25. Since 25<26, move lo to 5. Now lo=hi=5, so no candidates remain and the exact-match search returns not found."),
                    ("Name what is returned", "The answer 4 is an index, not the value 25 or the number of comparisons. For target 26, the final boundary 5 is useful as an insertion point in a different search variant, but it is not an index containing the requested value."),
                    ("Check the elimination", "After each comparison, say which region was removed and why it cannot hold a match. This is a better explanation than 'keep halving until found'. [[termination-and-code]] turns the trace into a reusable implementation and a progress argument."),
                ], "What does the exact-match search return for target 25 in [3,8,12,17,25,31,42]?",
                ["25", "5", "Index 4"], "Index 4",
                ["What changes when the target is 26?", "Why distinguish an index from a value?"]),
            lesson("termination-and-code", "Correct updates and termination",
                "A consistent loop reduces the candidate interval on every non-returning iteration.",
                "Implement exact-match binary search and justify that it cannot loop forever.", [
                    ("Use this complete version", "```python\ndef binary_search(values, target):\n    lo, hi = 0, len(values)\n    while lo < hi:\n        mid = lo + (hi - lo) // 2\n        if values[mid] < target:\n            lo = mid + 1\n        elif values[mid] > target:\n            hi = mid\n        else:\n            return mid\n    return -1\n```\nThe input must be sorted ascending under the same comparison used in the loop."),
                    ("Maintain the invariant", "If a matching value exists and has not yet been returned, at least one match remains inside [lo,hi). The initial interval covers the array. Each comparison excludes only indices whose ordered values cannot equal the target, preserving that statement."),
                    ("Measure progress", "The interval length hi-lo is a nonnegative integer. When the midpoint is too small, lo moves beyond mid; otherwise hi moves down to mid. Every non-returning iteration strictly decreases the length, so the loop must eventually find a match or reach an empty interval."),
                    ("Inspect the one-item trap", "With lo=4 and hi=5, mid=4. If the value is too small and you write lo=mid, the bounds never change. Writing lo=mid+1 correctly empties the interval. Tiny cases expose boundary bugs that a large random example can miss."),
                    ("State the duplicate behaviour", "This exact-match version returns some matching index, not necessarily the first. That is fine if any match satisfies the requirement. [[duplicate-boundaries]] shows how a different invariant locates first and last positions reliably without a linear scan afterwards."),
                ], "Why must the too-small branch update lo to mid+1 rather than mid?",
                ["To exclude the failed midpoint and guarantee progress", "To force the target to exist", "To make every array odd-length"],
                "To exclude the failed midpoint and guarantee progress", ["Which loop invariant proves no possible match is discarded?", "What does returning -1 mean?"]),
        ]),
        orbit(2, "Boundaries, costs, and applications", [
            lesson("duplicate-boundaries", "Duplicates and lower bounds",
                "Boundary search finds the first position whose key is at least the target.",
                "Distinguish any-match search from lower-bound and upper-bound searches.", [
                    ("Change the question", "For [2,4,4,4,9], an exact search for 4 might return index 2, but the first occurrence is index 1. A lower-bound search asks for the first index whose value is at least the target. It must continue searching left even after seeing equality."),
                    ("Use a boundary invariant", "Keep values before lo strictly less than target and values at or after hi at least target. The undecided interval is [lo,hi). At equality, move hi to mid, preserving the possibility that an earlier equal value exists."),
                    ("Implement the lower bound", "```python\ndef lower_bound(values, target):\n    lo, hi = 0, len(values)\n    while lo < hi:\n        mid = lo + (hi - lo) // 2\n        if values[mid] < target:\n            lo = mid + 1\n        else:\n            hi = mid\n    return lo\n```\nThe return value can be len(values), meaning all values are smaller than target."),
                    ("Find the other boundary", "An upper bound finds the first value strictly greater than target: move lo right while values[mid] <= target. For the three 4s, lower bound is 1 and upper bound is 4. Their difference, 3, counts occurrences without scanning the duplicate run."),
                    ("Verify equality separately", "A lower bound is not automatically an existing match. If i<n and values[i]==target, i is the first occurrence; otherwise the target is absent. [[insertion-points]] explains why the returned boundary is still useful when there is no match."),
                ], "What is the lower-bound index for 4 in [2,4,4,4,9]?",
                ["2, the middle match", "1, the first value at least 4", "4, the first value greater than 4"],
                "1, the first value at least 4", ["Why does equality move hi rather than immediately return?", "How can two boundaries count duplicates?"]),
            lesson("insertion-points", "Insertion points and edge cases",
                "A boundary can describe where a missing target belongs, including before or after every item.",
                "Interpret boundary results without accessing an out-of-range index.", [
                    ("Use a missing value", "In [3,8,12,17,25,31,42], lower_bound(26) returns 5. Inserting 26 immediately before the existing index 5 keeps the array sorted. The operation identifies a boundary; it does not claim 26 was already present."),
                    ("Handle both extremes", "Searching for a value smaller than every item returns insertion point 0. A value larger than every item returns n. Both are legitimate insertion boundaries. An empty list also has one insertion boundary, 0, even though it has no valid element index."),
                    ("Check before indexing", "For exact lookup based on a lower bound, test i<len(values) before reading values[i]. If i equals n, that element does not exist. Confusing a valid insertion boundary with a valid array access creates a common out-of-range bug."),
                    ("Choose a duplicate policy", "Inserting at the lower bound places a new equal key before existing equals. Inserting at the upper bound places it after them. Which is appropriate depends on the required tie policy and any arrival-order expectations for records."),
                    ("Separate search from movement", "Locating an array insertion point takes logarithmic comparisons, but physically inserting into a contiguous array may shift O(n) records. A fast position search does not make the entire update logarithmic. [[binary-search-complexity]] accounts for that full workload."),
                ], "What does a lower-bound result equal to len(values) mean?",
                ["The final item must equal the target", "The input was unsorted", "The insertion point is after all existing items"],
                "The insertion point is after all existing items", ["Why must i<n be checked before values[i]?", "How does inserting before equals differ from inserting after them?"]),
            lesson("binary-search-complexity", "Complexity and practical trade-offs",
                "Halving gives logarithmic comparisons, but preprocessing, access, and updates still have costs.",
                "Choose binary search for a suitable workload and account for its assumptions.", [
                    ("Count halvings", "After k roughly even halvings, the candidate count is about n/2^k. Reaching a constant-size interval needs O(log n) iterations. An array of around one million elements needs only about twenty halving decisions, rather than around one million element checks."),
                    ("State the cost model", "The usual O(log n) time claim assumes constant-time indexed access and bounded-cost comparisons. Accessing a linked list's midpoint is not a constant-time operation. Comparing very long keys also adds work not captured by merely counting comparisons."),
                    ("Include preparation", "If an unsorted array is searched once, a linear scan may be cheaper than sorting it just to use binary search. With q queries on a static dataset, sorting once in O(n log n) and then doing O(q log n) search work may become worthwhile."),
                    ("Include updates and memory", "An iterative binary search uses O(1) auxiliary space. Keeping a sorted array updated can require O(n) shifts per insertion. A hash table may suit exact membership queries, while sorted structures also support ordered boundaries and ranges. Choose based on operations, not a slogan."),
                    ("Explain the trade-off", "A logarithmic search does not make loading, sorting, or copying free. State whether the dataset is already ordered, frequently updated, or queried many times. The same halving technique can search a decision boundary rather than a stored key, as [[binary-search-on-answers]] demonstrates."),
                ], "Why might linear search be preferable for one query on an unsorted array?",
                ["Sorting first can cost more than one complete scan", "Binary search always takes O(n²)", "Linear search requires sorted input"],
                "Sorting first can cost more than one complete scan", ["Why is midpoint access important to the time bound?", "What changes when there are many queries?"]),
            lesson("binary-search-on-answers", "Binary search on a monotone answer",
                "Search the first feasible value when feasibility changes from false to true and never back.",
                "Define a monotone predicate, safe bounds, and a cost that includes evaluating the predicate.", [
                    ("Ask a decision question", "A ship must carry packages [4,2,3] in order within at most two days. Instead of guessing the minimum capacity directly, ask feasible(capacity): can this capacity finish the job in two days without splitting a package? Larger capacity cannot make a feasible schedule impossible."),
                    ("Test the threshold", "Capacity 4 needs three days: [4], [2], [3]. Capacity 5 needs two: [4], [2,3]. Thus the minimum is 5. For a fixed capacity, greedily filling each day until the next package does not fit gives a feasibility test for this ordered, nonnegative-load problem."),
                    ("Choose valid bounds", "The lower bound is at least the heaviest package, 4; the upper bound can be the total mass, 9, which fits in one day. Search between these inclusive capacity bounds. On a feasible midpoint, keep it as a possible answer by moving hi=mid; otherwise set lo=mid+1."),
                    ("Prove the pattern before applying it", "The predicate must change only from false to true as capacity increases. A test with arbitrary alternating answers cannot justify eliminating half the domain. The search loop differs from exact-match array search because a feasible midpoint may still have a smaller feasible answer to its left."),
                    ("Count the whole computation", "If the answer range has width R and each feasibility test scans n packages, the total is O(n log R), not merely O(log R). You can now recognise when binary search applies, state an invariant, prove progress, and explain the boundary that the result represents."),
                ], "For packages [4,2,3] kept in order and at most two days, what is the minimum daily capacity?",
                ["4", "5", "9"], "5",
                ["What makes the feasibility predicate monotone?", "Why must the cost of each feasibility check be included?"]),
        ]),
    ],
)
