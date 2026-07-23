# Visual Math Workspace

An interactive lab for learning math and computer science visually. Inspired by GeoGebra: every change — a slider, an equation edit, an algorithm step — has an immediate, intuitive visual effect. Built as a learning tool first: short lessons, one idea at a time, color that always means the same thing.

Four connected pages:

| Page | What it is |
|---|---|
| **Math workspace** (`/`) | Live curve vs goal curve: transformations, Riemann sums, derivatives, Taylor series, arc length |
| **Algorithm Lab** (`/algorithms`) | Python on the left, the algorithm's structure reacting on the right, step-by-step playback |
| **Data Structures** (`/structures`) | A tiered curriculum map, foundational → specialized, deep-linking into the Lab |
| **Concurrency Lab** (`/concurrency`) | Same shape as the Algorithm Lab, applied to threads: naive vs fixed, side by side |

## Math workspace — five paradigms

Each mode is one famous mathematical idea, with its own visual, a live formula readout, a goal to chase, and a one-line lesson in plain words:

| Mode | Idea | Visual | Goal |
|---|---|---|---|
| **Match** | Transformations — symbols move curves | live curve vs target | match the target curve |
| **Area ∫** | Riemann sums → the integral | rectangles melt into the region as `n` grows; signed area tinted | enclose an area of X |
| **Slope d⁄dx** | The derivative is local slope | draggable tangent probe | hit a target slope |
| **Series Σ** | Taylor series rebuild functions from powers | partial-sum polynomial hugs the true curve term by term | converge to the function |
| **Length** | Arc length = the limit of chord sums | straight segments straighten into the curve | match a target length |

Drag the `p`/`q` bounds directly on the graph; the approximation, the exact value, and the shrinking error are always visible — the limit definition made physical. Sliders auto-generate from whatever symbols your equation uses: type `a * sin(b * x) + k` and sliders for `a`, `b`, `k` appear on their own. A preset picker loads classics — Gaussian, logistic, sine, cubic — each with a one-line real-world blurb.

## Algorithm Lab

Real Python source with the executing line highlighted, an animated visualization of the data structure it's manipulating, and a narrated note for every step. Play, pause, scrub, step in either direction, change speed, roll new random input.

There is no interpreter: each algorithm's displayed Python is paired with a TypeScript twin that runs the same logic and records a full state snapshot per step — which is what makes stepping *backward* free.

Current catalogue:

- **Graphs** — Kahn's topological sort, BFS, DFS, Dijkstra, Kruskal's MST/Union-Find, Bellman-Ford, A* pathfinding
- **Sorting** — bubble, insertion, quicksort, merge sort
- **Searching** — binary search
- **Data structures** — binary min-heap (with its array twin), binary search tree, trie (insert + autocomplete), linked-list reversal, hash table with chaining, LRU cache
- **Dynamic programming** — 0/1 knapsack, filled cell by cell on a live DP table
- **Backtracking** — N-Queens: place, conflict, undo, on a random-size board each run

Adding an algorithm is one catalogue entry + one runner; the page never changes.

## Data Structures

A curriculum page ordered from foundational to specialized — what each structure is, its costs, and where it lives in real systems (databases, schedulers, browsers, editors). Structures with a live demo link straight into the Algorithm Lab.

## Concurrency Lab

The same code-left/visualization-right/playback shape as the Algorithm Lab, turned on threads instead of algorithms. There is no real threading — a deterministic round-robin scheduler gives each thread one action per turn, which is what makes a genuine race condition or deadlock *reproducible and scrubbable* instead of a one-time timing accident.

Every scenario ships as a naive/fixed pair, so the lesson is "one code change removes an entire bug class," not just "here is a bug":

- **Deadlock** — dining philosophers. Naive (everyone reaches for their left fork first) deadlocks every run; fixed (one thread reaches right-first, breaking the symmetry) never does.
- **Synchronization** — producer-consumer (naive has no capacity check and overflows a bounded buffer under a realistic 3-producer/1-consumer rate mismatch; fixed blocks the producer instead — backpressure), readers-writers (naive lets an unsynchronized reader catch a writer's update mid-way — a torn read; fixed takes a lock on both sides), and a lost-update counter (naive has two threads read-modify-write a shared counter unsynchronized — both finish believing they succeeded, but the final count is silently wrong; fixed makes the increment atomic).
- **Fairness** — priority scheduling. Not a correctness bug at all: strict priority starves a low-priority thread forever, exactly as designed; fixed adds aging (waiting itself raises effective priority) so starvation becomes mathematically impossible.

Five distinct bug classes, five fixes: circular wait, missing backpressure, missing mutual exclusion (loud — a torn read) and missing mutual exclusion (silent — a lost update), and plain unfairness.
