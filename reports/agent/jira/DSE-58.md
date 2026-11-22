# DSE-58 — Implement Docker Sandbox Runner for Code Execution

## 1. General Info
- Jira ID: DSE-58 (Epic DSE-3, blocked-by DSE-57 Done)
- Project / Sprint: DSE / Sprint 5: Core Grading (Sandbox + Score + AI)
- Date: 2026-11-18
- Status: ~~PARTIAL — code + unit tests done; not yet run against a real Docker daemon~~ → (2026-11-18, session 2) DONE for demo scope — verified live on Docker 29.9.3, see §4 session 2
- Repository / Branch: Sloth-nvbach/base_prj / main

## 2. Objective & Acceptance Criteria
Isolated Docker runner, `POST /api/sandbox/run` contract used by DSE-22. Demo scope (Jira comment 18/11): JavaScript + Python; new container per run, `--network none`, 256 MB, 0.5 CPU, 10 s, non-root, `--read-only` + tmpfs /tmp; handle timeout / OOM / compile-runtime errors. Out of scope: pre-warmed pool, Prometheus, custom seccomp, load test, 80 % coverage, Java/C/C++.

## 3. Initial Survey
BE client `sandbox.service.ts` + BullMQ worker (DSE-22) already call `${SANDBOX_API_URL}/api/sandbox/run` and map results by index. No runner existed. Docker CLI 29.8.2 installed but daemon not running on this machine.

## 4. Execution Log
- 2026-11-18: New zero-dependency Node service `sandbox/` (`runner.mjs`, `server.mjs`). One container per test case (`--rm --pull never --network none --memory/--memory-swap 256m --cpus 0.5 --pids-limit 64 --read-only --tmpfs /tmp:size=10m --user 65534 --cap-drop ALL --security-opt no-new-privileges`), max 4 in parallel, `docker kill` on 10 s timeout. Status: timeout > memory_limit (exit 137) > error (non-zero exit) > completed. Docker failure (exit 125, daemon down) → HTTP 503. Optional Bearer `SANDBOX_API_KEY` (timing-safe), 1 MB body, code/input ≤ 64 KB, ≤ 50 test cases, output capped 64 KB. Scripts `npm run sandbox`, `npm run sandbox:pull`; tests added to root `npm test`.
- Decision: separate service (not inside BE) so student code never runs on the API server and the runner can be deployed on its own host.

- 2026-11-18 (session 2) — live verification, Docker 29.9.3:
  - Runner API (`npm run sandbox`): JS/Python correct → completed 2/2 (~0.6–1.1 s); wrong output → completed 0/2; Python syntax error / JS runtime error → error + stderr; `while(true)` → timeout at 10.3 s; 1 GB allocation → memory_limit (exit 137); network call → URLError (no network); write /etc → read-only FS error; /tmp writable, uid 65534; 500 child processes → EAGAIN (pids limit); 5 parallel runs → 1.9 s.
  - End-to-end BE → BullMQ/Redis → runner → Mongo: Python correct → graded 2/2 points; syntax error → error + stderr stored.
  - Fixed: the BullMQ worker was never started (runs stayed queued forever) → `server.ts` starts it when `SANDBOX_API_URL` is set and closes it on shutdown.
  - Fixed: Redis settings read `process.env` in two services → `REDIS_HOST/PORT/PASSWORD` in `config/env.ts` + `.env.example`; worker reuses queue's `redisConnection`; Redis added to `docker-compose.yml`.
  - Added: "Memory limit exceeded (256MB)" in stderr for OOM.
  - Found, NOT fixed (needs decision): `submission.service.ts:79` sends only `isHidden: false` test cases, so hidden test cases are never graded.
  - Found, NOT fixed: local dev DB has 13 legacy users with role `user` (pre-role-change); `npm run seed` skips existing accounts so they stay `user` and get 403 on student endpoints. Updated only `student01@example.com` → `student` for the test.
- 2026-11-18 (session 3): user decided hidden test cases are graded. `submission.service.ts` now sends all test cases to the sandbox (input/expected output stay hidden from students; per-test stdout/pass is visible in run results). Test: assignment with only hidden cases → run 202 (failed before fix).

## 5. Files Changed
| File | Action | Description |
|------|--------|-------------|
| sandbox/runner.mjs | CREATE | Docker args, exec with timeout/kill, grading |
| sandbox/server.mjs | CREATE | HTTP API, auth, validation |
| sandbox/sandbox.test.mjs | CREATE | 7 tests (fake docker exec) |
| package.json | MODIFY | `sandbox`, `sandbox:pull`, test step |
| BE/.env.example, AGENTS.md, BE/docs/architecture.md | MODIFY | Setup docs |
| BE/src/server.ts | MODIFY | (session 2) start/close run worker |
| BE/src/config/env.ts, BE/.env.example | MODIFY | (session 2) REDIS_* vars |
| BE/src/services/queue.service.ts, submission-run.worker.ts | MODIFY | (session 2) env-based shared Redis connection |
| docker-compose.yml | MODIFY | (session 2) Redis service |

## 6. Testing & Verification
| Test | Command / Method | Result | Notes |
|------|------------------|--------|-------|
| Lint | `npm run lint` | PASS | FE only; sandbox not linted |
| Unit | `node --test sandbox/sandbox.test.mjs` | PASS | 7/7, Docker faked |
| Full suite | `npm test` | PASS | |
| Build | `npm run build` | PASS | |
| Real Docker run | `npm run sandbox` + sample programs | NOT RUN | Docker daemon not running |
| Real Docker run (session 2) | runner API + 11 sample programs | PASS | see §4 session 2 |
| End-to-end (session 2) | BE + Redis + runner, 3 submissions | PASS | hidden test cases skipped (see §10) |
| Full suite (session 2) | npm test / lint / build | PASS | BE 406, FE 125, sandbox 7 |

## 7. Acceptance Criteria
| Criteria | Status | Evidence |
|----------|--------|----------|
| Images for languages (demo: JS, Python) | PARTIAL | Official images via `sandbox:pull`; not pulled here |
| API returns correct results for sample programs | NOT VERIFIED | Logic tested with fake exec only |
| Timeout, OOM, compile errors handled | PASS (unit) | sandbox.test.mjs |
| 5 parallel runs < 10 s | NOT VERIFIED | out of demo scope |
| Security (no network, non-root, read-only, caps dropped) | PASS (args) | docker args test; no escape audit |
| Integration with DSE-22 | PARTIAL | Contract matches `sandbox.service.ts`; not run end-to-end |
| Coverage > 80 % | N/A | out of demo scope |

Correction 2026-11-18 (session 2): "API returns correct results", "Timeout/OOM/compile errors", "5 parallel runs < 10 s" (1.9 s) and "Integration with DSE-22" are now PASS (live). Security: no network / read-only / non-root / pids limit verified live; no formal escape audit. Images: JS + Python pulled and used.

## 8. Jira
- Status before: In Progress. Proposed: keep In Progress until real Docker verification. Executed: none.
- (session 2) Proposed: In Progress → Done (demo scope). Needs approval.
- 2026-11-18 (session 3, user approved): In Progress → Done (demo scope).

## 9. GitHub
- Branch: main
- Commit message: feat: DSE-27 AI service connection layer + DSE-58 docker sandbox runner

## 10. Blockers & Remaining Work
- Docker daemon not running locally → no live verification.
- `memoryUsedMB` always 0 (not measured).
- BE allows `typescript`, `java`, `cpp`, `c` submissions; runner answers 400 for them (demo scope).
- (session 2) Decide whether hidden test cases count toward the run score (`submission.service.ts:79`).
- (session 2) Migrate legacy `role: 'user'` accounts in dev DB (or have seed fix roles of existing demo accounts).

## 11. Next Steps
1. Start Docker Desktop, `npm run sandbox:pull`, `npm run sandbox`, set `SANDBOX_API_URL=http://localhost:5010` in `BE/.env`.
2. Run a JS and a Python sample (correct, wrong output, infinite loop, huge allocation, syntax error) and an end-to-end submission run.

## 12. Session History
| Date | Progress | Changes | Status |
|------|----------|---------|--------|
| 2026-11-18 | Runner + tests | sandbox/, scripts, docs | PARTIAL |
| 2026-11-18 (2) | Live + E2E verified, worker start fix | server.ts, env, compose, runner | DONE (demo) |
| 2026-11-18 (3) | Hidden test cases graded | submission.service.ts, submission-run.test.ts | DONE (demo) |
