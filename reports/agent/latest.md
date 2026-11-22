# Latest — 2026-11-23

> Overwritten each session (≤ 20 lines). Full history lives in `jira/<ID>.md` and `git log`.

- **Done (demo 24/11 scope, committed + pushed):** grading API, AI review, teacher grading UI, student flow, live E2E + user guide; Jira: 17 issues Done (DSE-23, 24, 25, 26, 28, 31, 32, 33, 35, 36, 37, 38, 44, 45, 47, 54, 55). DSE-53 In Progress, DSE-39 To Do.
- **Pre-demo fixes (2026-11-23):** TypeScript submissions now run (Node type stripping, verified live); admin area confirmed admins-only since DSE-12 — stale docs corrected; `npm run cleanup:legacy` repaired 3 legacy dev submissions (real grades untouched).
- **Verified:** `npm test` (BE 422, FE 140, sandbox 8), lint, build.
- **Remaining (estimates in chat 2026-11-23):** group 2 AC gaps (test→criterion mapping, splitter/shortcuts, diff/memory, CSV/bulk re-run, syntax highlight/version compare, draft state, Java/C/C++); group 3 (assignment↔class link, DSE-53, DSE-39, AI prompt policy, Playwright UI tests, tech debt, production deploy).
- **Run demo:** `docker compose up -d`, `npm run seed`, `npm run sandbox`, `SANDBOX_API_URL=http://localhost:5010` in `BE/.env`, `npm run dev`, optional `npm run e2e`. Guide: `docs/user-guide.md`.
