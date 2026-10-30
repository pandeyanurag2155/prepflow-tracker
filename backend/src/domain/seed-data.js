/* Starting plan, kept compact: build-seed.js expands these arrays into groups and items.
   The plan runs for settings.planMonths (default 3) months from settings.planStart. Roadmap and
   NeetCode themes carry the month they belong to (0 = before you start). Striver is self-paced:
   its problems come from striver-sheet.json in the sheet’s own order, with no schedule. */

// Roadmap themes: [month, title, focus, tasks]. A trailing [DSA]/[SD]/[Deep]/[Beh]/[App] sets the track;
// a task starting “Checkpoint:” gets the Checkpoint track.
export const TAG_TRACK = { DSA: 'DSA', SD: 'System design', Deep: 'Deep dive', Beh: 'Behavioral', App: 'Applications' };
export const ROADMAP_SEED = [
  [0, 'Set up inputs', '', [
    'Audit resume; cut claims you can’t defend through 3 “why?”s',
    'Collect real metrics (p95, req/day, events/day, cache hit rate) via Grafana, logs or pg_stat_statements; run k6 on staging if none exist',
    'Set up tracking: this tracker, a design sketch folder, a STAR stories doc',
    'Shortlist 30 product or high-growth companies; find referral contacts at 10',
    'Book 2 mock interviews for month 2',
    'Pick a daily slot for Striver A2Z: a few problems whenever you have time',
  ]],
  [1, 'Foundations and the event loop', '', [
    'DSA: NeetCode hash maps, prefix sums, two pointers [DSA]',
    'Notes on CAP, replication and lag, sharding, consistent hashing [SD]',
    'Predict and explain setTimeout/setImmediate/nextTick/Promise ordering [Deep]',
    'Block the loop with pbkdf2Sync, measure with monitorEventLoopDelay, fix it [Deep]',
    'Draft 8 STAR story skeletons [Beh]',
    'Checkpoint: explain the libuv threadpool in under 2 minutes',
  ]],
  [1, 'Rate limiting and Go concurrency', '', [
    'DSA: NeetCode sliding window, stacks, binary search [DSA]',
    'Token-bucket rate limiter as a Redis Lua script [SD]',
    'URL shortener design [SD]',
    'Go worker pool with errgroup and context; pass -race [Deep]',
    'Reproduce and find a goroutine leak with pprof [Deep]',
    'Rewrite resume bullets as verb + system + decision + metric + scale [Beh]',
    'Checkpoint: resume v2 reviewed by a senior engineer',
  ]],
  [1, 'Caching', '', [
    'DSA: NeetCode linked lists, trees, BSTs [DSA]',
    'Sketch cache-aside, write-through and write-behind trade-offs [SD]',
    'Cache-aside with delete-on-write, TTL jitter, singleflight; stampede load test [Deep]',
    'Redis eviction policies, RDB vs AOF, Redlock and fencing tokens [Deep]',
    '10 referral requests + 10 applications [App]',
    'Checkpoint: explain stampede, penetration and avalanche, with fixes',
  ]],
  [2, 'Messaging', '', [
    'DSA: NeetCode heaps, backtracking, tries [DSA]',
    'Notification service design with backoff, jitter and DLQ [SD]',
    'Kafka acks=all, idempotence, RF 3, min.insync.replicas=2, manual commit; kill a consumer mid-batch [Deep]',
    'Idempotent consumer via processed_messages ON CONFLICT DO NOTHING [Deep]',
    'Kafka vs RabbitMQ vs Redpanda comparison from memory [Deep]',
    '2 mock interviews [Beh]',
    '10 applications [App]',
  ]],
  [2, 'Payments and SQL', '', [
    'DSA: NeetCode graphs [DSA]',
    'Wallet design: idempotency keys, outbox, saga [SD]',
    'EXPLAIN ANALYZE your top 5 queries; fix one with an index [Deep]',
    'Reproduce lost update and write skew; fix them [Deep]',
    'SKIP LOCKED job queue + keyset pagination [Deep]',
    'Rehearse STAR stories at 90 seconds each [Beh]',
  ]],
  [2, 'Chat, feed, Postgres internals', '', [
    'DSA: NeetCode dynamic programming [DSA]',
    'Chat system design [SD]',
    'News feed design [SD]',
    'MVCC, VACUUM, deadlocks, partitioning, PgBouncer [Deep]',
    '2 mock interviews [Beh]',
    'Follow-ups + 10 applications [App]',
  ]],
  [3, 'LLD and project', '', [
    'DSA: NeetCode intervals, greedy, 2-D DP, timed [DSA]',
    'LLD: seat booking with concurrency [SD]',
    'LLD: LRU cache and Splitwise [SD]',
    'NestJS project: outbox, rate limiter, README with diagram and k6 results [Deep]',
    'Company-specific research [App]',
  ]],
  [3, 'Final drills', '', [
    'DSA: NeetCode bit tricks + redo 15 failed problems [DSA]',
    '2 timed full system designs [SD]',
    'Three levels of “why?” on every resume bullet [Deep]',
    '2 final mock interviews [Beh]',
    'Negotiation prep [Beh]',
  ]],
];

export const PRACTISE_TIPS = [
  'Give each problem 25 minutes alone; if stuck, read the approach, not the code, then write it yourself',
  'Say your approach and its complexity aloud before coding',
  'Log pattern, key insight and time; re-solve misses on day 3 and day 7',
  'Use one language for all DSA rounds; target Medium in under 30 minutes by month 3',
  'NeetCode drills interview patterns; Striver builds depth. Linked duplicates count once.',
];

// NeetCode themes: [month, title, concepts ('; '-separated or array), problems (', '-separated, trailing E/M/H)]
export const DIFF_CODE = { E: 'Easy', M: 'Medium', H: 'Hard' };
export const DSA_SEED = [
  [1, 'Fundamentals', ['Big-O and amortized cost', 'Recursion', 'Merge sort, quicksort, counting sort', 'Your language’s DSA toolkit (Go: container/heap; JS: a hand-written MinHeap)'], ''],
  [1, 'Hashing, prefix sums, two pointers', 'hash maps/sets; prefix sums; two pointers',
    'Contains Duplicate E, Valid Anagram E, Two Sum E, Group Anagrams M, Top K Frequent Elements M, Product of Array Except Self M, Valid Sudoku M, Longest Consecutive Sequence M, Valid Palindrome E, Two Sum II M, 3Sum M, Container With Most Water M, Trapping Rain Water H'],
  [1, 'Sliding window, stacks, binary search', 'sliding window; monotonic stack; binary search on the answer',
    'Best Time to Buy and Sell Stock E, Longest Substring Without Repeating Characters M, Longest Repeating Character Replacement M, Permutation in String M, Minimum Window Substring H, Valid Parentheses E, Min Stack M, Evaluate Reverse Polish Notation M, Daily Temperatures M, Car Fleet M, Binary Search E, Search a 2D Matrix M, Koko Eating Bananas M, Find Minimum in Rotated Sorted Array M, Search in Rotated Sorted Array M, Time Based Key-Value Store M'],
  [1, 'Linked lists, trees, BSTs', 'dummy head and fast/slow pointers; tree traversals and BFS; BST invariants',
    'Reverse Linked List E, Merge Two Sorted Lists E, Linked List Cycle E, Reorder List M, Remove Nth Node From End of List M, Copy List with Random Pointer M, Add Two Numbers M, LRU Cache M, Invert Binary Tree E, Maximum Depth of Binary Tree E, Diameter of Binary Tree E, Same Tree E, Lowest Common Ancestor of a BST M, Binary Tree Level Order Traversal M, Binary Tree Right Side View M, Validate Binary Search Tree M, Kth Smallest Element in a BST M'],
  [2, 'Heaps, backtracking, tries', 'heaps and top-K; backtracking template; tries',
    'Kth Largest Element in a Stream E, Last Stone Weight E, K Closest Points to Origin M, Kth Largest Element in an Array M, Task Scheduler M, Find Median from Data Stream H, Subsets M, Combination Sum M, Permutations M, Subsets II M, Word Search M, Letter Combinations of a Phone Number M, Implement Trie M'],
  [2, 'Graphs', 'graph representations; BFS/DFS and multi-source BFS; topological sort, union-find, Dijkstra',
    'Number of Islands M, Clone Graph M, Max Area of Island M, Pacific Atlantic Water Flow M, Rotting Oranges M, Course Schedule M, Course Schedule II M, Number of Connected Components M, Redundant Connection M, Graph Valid Tree M, Network Delay Time M, Word Ladder H'],
  [2, 'Dynamic programming', 'recurrence → memo → tabulation → O(1) space; spotting DP; take/skip and knapsack',
    'Climbing Stairs E, Min Cost Climbing Stairs E, House Robber M, House Robber II M, Longest Palindromic Substring M, Decode Ways M, Coin Change M, Maximum Product Subarray M, Word Break M, Longest Increasing Subsequence M, Partition Equal Subset Sum M'],
  [3, 'Intervals, greedy, 2-D DP', 'intervals and sweep line; greedy proofs; 2-D DP',
    'Maximum Subarray M, Jump Game M, Gas Station M, Merge Intervals M, Insert Interval M, Non-overlapping Intervals M, Meeting Rooms II M, Unique Paths M, Longest Common Subsequence M'],
  [3, 'Bit manipulation and contests', 'bit tricks (XOR, n & (n-1)); one-page pattern cheat sheet; 2 timed virtual contests',
    'Single Number E, Number of 1 Bits E, Counting Bits E, Missing Number E, Reverse Bits E'],
];

// Striver A2Z is self-paced: one step per sheet chapter, in the sheet’s order, plus this wrap-up step.
// Problems, links and levels come from striver-sheet.json (refresh it with `npm run striver:fetch`).
export const STRIVER_WRAP_UP = ['Wrap-up', ['Redo every problem marked for revisit', '3 timed virtual contests']];

// Topic revision: language → [Basic (month 1), Intermediate (month 2), Advanced (month 3)], topics separated by '; '
export const REVISION_SEED = {
  'JavaScript': [
    'var/let/const and scope; hoisting and TDZ; primitives vs references; coercion and == vs ===; operators ?? and ?.; function kinds, default/rest params, arguments; higher-order functions and callbacks; scope chain and lexical environment; closures and the loop bug; IIFE; this basics and strict mode; objects and Object.keys/entries; array methods, slice vs splice, sort gotcha; strings and template literals; destructuring and spread; for…of vs for…in, forEach can’t break; try/catch/finally; number pitfalls and BigInt',
    'call/apply/bind and arrow this; prototypes and Object.create; classes, #private, static; execution context and call stack; event loop and queues; callbacks and callback hell; Promises; async/await sequential vs parallel; Promise combinators and bounded concurrency; ESM vs CommonJS; iterators, generators, for await; Map/Set/WeakMap/WeakSet; shallow vs deep copy, structuredClone; immutability and freeze; currying, compose, memoize; debounce and throttle from scratch; regex, dates, Intl',
    'micro/macrotask output puzzles; V8 JIT, hidden classes, inline caches; GC and memory leaks; polyfills (bind, map, Promise.all); a Promise from scratch; Proxy and Reflect; Symbols and property descriptors; tagged templates; JS design patterns; custom errors, cause, AggregateError; typed arrays, SharedArrayBuffer, Atomics; prototype pollution, eval, ReDoS; TypeScript basics and narrowing; TypeScript generics, utility, conditional and mapped types, infer',
  ],
  'Node.js': [
    'V8 + libuv model; CommonJS and require cache; ESM in Node and interop; npm, semver, lockfiles, npm ci; globals and process; fs/path/os/crypto; plain http server; EventEmitter; timers; env config and dotenv; Express routing, middleware, error middleware; REST design, status codes, idempotency',
    'event loop phases and starvation; libuv threadpool size; blocking vs CPU-bound work; streams, backpressure, pipeline; Buffers and encodings; async errors and unhandledRejection; graceful shutdown; sessions vs JWT, refresh rotation, OAuth2; validation (zod/joi/class-validator); pg pool, ORMs, transactions, migrations; Redis client usage; streaming file uploads; BullMQ jobs; WebSockets/Socket.IO; NestJS modules, DI, guards, interceptors, pipes, filters; Jest and supertest',
    'worker_threads vs cluster vs child_process; scaling and sticky sessions; profiling with --inspect, clinic.js, flame graphs; heap snapshots and leaks; event loop lag with perf_hooks; AsyncLocalStorage; keep-alive, timeouts behind a load balancer, HTTP/2; pino, OpenTelemetry, Prometheus; timeouts, retries, circuit breakers, bulkheads; kafkajs, amqplib, NestJS transports; gRPC; OWASP, helmet, CORS, SSRF; Docker, probes, zero-downtime deploys; N-API awareness',
  ],
  'Go': [
    'go tooling, gofmt, vet; var vs :=, iota, zero values; types, strings, runes, UTF-8; if-init, for, switch, labels; multiple returns, variadic, closures; slices, len/cap, append, aliasing; maps, comma-ok, nil-map panic; structs, embedding, tags; pointers and receivers, method sets; interfaces, assertions, nil-interface gotcha; errors with %w, Is/As; defer/panic/recover; packages, init, internal; strings/strconv/fmt/slices; table-driven tests',
    'goroutines; channels buffered/unbuffered, close, range; select with timeouts; Mutex, RWMutex, WaitGroup, Once; context cancel/timeout/value; worker pool, fan-out/in, pipeline, semaphore, errgroup; generics and constraints; net/http, ServeMux, middleware, timeouts; chi/gin/echo; encoding/json; io.Reader/Writer and bufio; database/sql, pgx, sqlc vs GORM; project layout and constructor DI; httptest and interface mocks; slog and config',
    'GMP scheduler and GOMAXPROCS; memory model; escape analysis; GC, GOGC, GOMEMLIMIT; race detector; goroutine leaks and goleak; pprof profiles and trace; benchmarks and benchstat; atomic, sync.Pool, sync.Map; nil/closed channel behaviour; graceful shutdown; gRPC/protobuf; Kafka and Redis clients; reflect and unsafe; static builds and distroless images; fuzzing',
  ],
  'SQL': [
    'relational model; data types (NUMERIC for money, TIMESTAMPTZ, UUID, JSONB); DDL, DML, RETURNING; SELECT/WHERE/ORDER BY/LIMIT/DISTINCT; LIKE, IN, BETWEEN, NULL logic; joins; GROUP BY and HAVING; subqueries and EXISTS; UNION vs UNION ALL, INTERSECT, EXCEPT; constraints and ON DELETE; normalization to 3NF; logical query order; CASE, COALESCE, NULLIF',
    'window functions and frames; CTEs and recursive CTEs; views vs materialized views; how B-trees work; composite, covering, partial, expression indexes; why indexes go unused; EXPLAIN ANALYZE scans and joins; transactions, savepoints, ACID; upserts in PostgreSQL vs MySQL; OFFSET vs keyset pagination; N+1 and batching; pg_stat_statements and slow log; procedures and triggers; classic queries (Nth salary, top-N per group, gaps and islands); JSONB querying',
    'isolation levels and anomalies; PostgreSQL vs InnoDB behaviour; MVCC, VACUUM, bloat, HOT; FOR UPDATE, SKIP LOCKED, NOWAIT, advisory locks; deadlocks and lock ordering; optimistic vs pessimistic concurrency; GIN/GiST/BRIN and full-text; planner statistics; partitioning and pruning; sharding and shard keys; replication and lag; WAL, backups, PITR; PgBouncer and max_connections; zero-downtime migrations; outbox and CDC (Debezium); InnoDB clustered index vs PostgreSQL heap',
  ],
};

// Extra revision topics, each linked to a reference article: language → [level, title, link]
export const REVISION_EXTRA = {
  'JavaScript': [
    ['Basic', 'data types, typeof and the typeof null quirk', 'https://javascript.info/types'],
    ['Basic', 'logical operators ||, && and short-circuit return values', 'https://javascript.info/logical-operators'],
    ['Basic', 'loops, labels, break/continue and switch (strict comparison)', 'https://javascript.info/while-for'],
    ['Basic', 'methods of primitives (wrapper objects)', 'https://javascript.info/primitives-methods'],
    ['Basic', 'JSON.stringify/parse: replacer, reviver, toJSON', 'https://javascript.info/json'],
    ['Basic', 'recursion and the call stack', 'https://javascript.info/recursion'],
    ['Basic', 'setTimeout vs setInterval, nested setTimeout, clearing timers', 'https://javascript.info/settimeout-setinterval'],
    ['Basic', 'URL and URLSearchParams', 'https://javascript.info/url'],
    ['Intermediate', 'constructor functions and what new does', 'https://javascript.info/constructor-new'],
    ['Intermediate', 'object to primitive conversion (Symbol.toPrimitive, valueOf, toString)', 'https://javascript.info/object-toprimitive'],
    ['Intermediate', 'getters, setters and accessor properties', 'https://javascript.info/property-accessors'],
    ['Intermediate', 'function object: name, length, named function expressions', 'https://javascript.info/function-object'],
    ['Intermediate', 'decorators and forwarding (spy and caching wrappers)', 'https://javascript.info/call-apply-decorators'],
    ['Intermediate', 'class inheritance: extends, super, overriding, extending built-ins', 'https://javascript.info/class-inheritance'],
    ['Intermediate', 'promise error handling and unhandled rejections', 'https://javascript.info/promise-error-handling'],
    ['Intermediate', 'promisification (util.promisify)', 'https://javascript.info/promisify'],
    ['Intermediate', 'dynamic import() and top-level await', 'https://javascript.info/modules-dynamic-imports'],
    ['Intermediate', 'globalThis and the global object', 'https://javascript.info/global-object'],
    ['Intermediate', 'fetch, AbortController and request timeouts', 'https://javascript.info/fetch-abort'],
    ['Advanced', 'native prototypes, method borrowing, Object.create(null) dictionaries', 'https://javascript.info/native-prototypes'],
    ['Advanced', 'instanceof, Symbol.hasInstance and mixins', 'https://javascript.info/instanceof'],
    ['Advanced', 'Reference Type: why a detached method loses this', 'https://javascript.info/reference-type'],
    ['Advanced', 'Unicode and string internals: surrogate pairs, normalize()', 'https://javascript.info/unicode'],
    ['Advanced', 'WeakRef and FinalizationRegistry', 'https://javascript.info/weakref-finalizationregistry'],
    ['Advanced', 'regex deep dive: capture groups, lookaround, greedy vs lazy', 'https://javascript.info/regexp-groups'],
  ],
  // Go topics linked to gobyexample.com
  'Go': [
    ['Basic', 'arrays vs slices: fixed size and value copies', 'https://gobyexample.com/arrays'],
    ['Basic', 'range over slices, maps, strings and the Go 1.22 loop-variable change', 'https://gobyexample.com/range-over-built-in-types'],
    ['Basic', 'enums with iota and the Stringer interface', 'https://gobyexample.com/enums'],
    ['Basic', 'custom error types and sentinel errors', 'https://gobyexample.com/custom-errors'],
    ['Basic', 'fmt verbs: %v, %+v, %#v, %T, %q', 'https://gobyexample.com/string-formatting'],
    ['Basic', 'sorting: slices.Sort, slices.SortFunc, sort.Slice', 'https://gobyexample.com/sorting-by-functions'],
    ['Basic', 'time: Duration, Unix epoch, layout-based formatting and parsing', 'https://gobyexample.com/time-formatting-parsing'],
    ['Basic', 'files: os.ReadFile/WriteFile, bufio.Scanner, filepath, temp dirs', 'https://gobyexample.com/reading-files'],
    ['Basic', 'CLI: os.Args, flag, subcommands, env vars; os.Exit skips defers', 'https://gobyexample.com/command-line-flags'],
    ['Intermediate', 'channel directions (chan<- and <-chan)', 'https://gobyexample.com/channel-directions'],
    ['Intermediate', 'non-blocking channel ops with select default', 'https://gobyexample.com/non-blocking-channel-operations'],
    ['Intermediate', 'time.Timer, time.Ticker and time.After pitfalls', 'https://gobyexample.com/timers'],
    ['Intermediate', 'rate limiting with tickers and x/time/rate', 'https://gobyexample.com/rate-limiting'],
    ['Intermediate', 'stateful goroutines: share memory by communicating', 'https://gobyexample.com/stateful-goroutines'],
    ['Intermediate', 'range-over-func iterators (iter.Seq, Go 1.23)', 'https://gobyexample.com/range-over-iterators'],
    ['Intermediate', 'http.Client: timeouts, connection reuse, closing Body', 'https://gobyexample.com/http-client'],
    ['Intermediate', 'text/template and html/template', 'https://gobyexample.com/text-templates'],
    ['Intermediate', 'regexp package (RE2: linear time, no backtracking)', 'https://gobyexample.com/regular-expressions'],
    ['Intermediate', 'net/url parsing and query params', 'https://gobyexample.com/url-parsing'],
    ['Intermediate', 'sha256, base64 and crypto/rand vs math/rand', 'https://gobyexample.com/sha256-hashes'],
    ['Intermediate', '//go:embed for static files and SQL migrations', 'https://gobyexample.com/embed-directive'],
    ['Advanced', 'TCP server with net.Listen and a goroutine per connection', 'https://gobyexample.com/tcp-server'],
    ['Advanced', 'os/exec, pipes and syscall.Exec', 'https://gobyexample.com/spawning-processes'],
  ],
  // SQL topics linked to w3schools.com/sql
  'SQL': [
    ['Basic', 'aggregate functions and NULLs: COUNT(*) vs COUNT(col), AVG', 'https://www.w3schools.com/sql/sql_aggregate_functions.asp'],
    ['Basic', 'self join and FULL OUTER JOIN', 'https://www.w3schools.com/sql/sql_join_self.asp'],
    ['Basic', 'ANY and ALL with subqueries', 'https://www.w3schools.com/sql/sql_any_all.asp'],
    ['Basic', 'INSERT INTO … SELECT and CREATE TABLE AS', 'https://www.w3schools.com/sql/sql_insert_into_select.asp'],
    ['Basic', 'auto-increment keys: SERIAL/IDENTITY vs AUTO_INCREMENT vs UUID', 'https://www.w3schools.com/sql/sql_autoincrement.asp'],
    ['Basic', 'date/time functions: NOW(), date_trunc, intervals, time zones', 'https://www.w3schools.com/sql/sql_dates.asp'],
    ['Basic', 'DELETE vs TRUNCATE vs DROP', 'https://www.w3schools.com/sql/sql_ref_truncate_table.asp'],
    ['Basic', 'LIMIT vs TOP vs FETCH FIRST across databases', 'https://www.w3schools.com/sql/sql_top.asp'],
    ['Basic', 'string functions: CONCAT, SUBSTRING, LENGTH, TRIM, REPLACE', 'https://www.w3schools.com/sql/sql_ref_mysql.asp'],
    ['Intermediate', 'SQL injection and parameterized queries', 'https://www.w3schools.com/sql/sql_injection.asp'],
    ['Intermediate', 'prepared statements (and the PgBouncer transaction-mode caveat)', 'https://www.w3schools.com/sql/sql_prepared_statements.asp'],
  ],
};
