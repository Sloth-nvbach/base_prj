# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

All rules, commands, conventions and the per-Jira-task workflow live in `AGENTS.md` (the single source of truth). Do not duplicate them here — change `AGENTS.md` instead.

@AGENTS.md

## Big picture (how the pieces connect)

- **Three processes:** `BE/` (Express API :5003), `FE/` (Vite :5173, talks to BE only via `shared/api/http.ts`), `sandbox/` (plain Node service :5010 that runs student code in throwaway Docker containers — `server.mjs` + limits in `runner.mjs`).
- **Code-run pipeline:** FE `POST /api/submissions/:id/run` → BE enqueues a BullMQ job (Redis) → `submission-run.worker.ts` (started in `BE/src/server.ts` only when `SANDBOX_API_URL` is set) → HTTP to `sandbox/` → results written to `runStatus`/`testResults`/`totalScore` on the submission → FE polls `GET /run-result`. Runs never touch the teacher-owned `status`/`score`/`feedback`.
- **Where to read before editing:** BE layers/patterns → `BE/docs/architecture.md`; FE module system → `FE/docs/architecture.md`; assignments/submissions/grading/AI review → `docs/domain.md`.
- **Single test file:** `npm test --prefix BE -- <pattern>` / `npm test --prefix FE -- <pattern>`; sandbox tests: `node --test sandbox/sandbox.test.mjs`. CI (`.github/workflows/ci.yml`) runs BE and FE test/lint/build separately, plus a `gen:module` scaffold smoke test.
