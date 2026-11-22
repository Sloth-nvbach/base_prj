# Latest — 2026-11-23

> Overwritten each session (≤ 20 lines). Full history lives in `jira/<ID>.md` and `git log`.

- **Done today (demo 24/11 scope, all committed + pushed):** grading API (DSE-24/26), AI review (DSE-28/31/32/33), teacher grading UI (DSE-35/36/37/38/25/23), student flow (DSE-54/55, DSE-53 partial), live E2E + fixes + user guide (DSE-44/45/47).
- **Verified:** `npm test` (BE 421, FE 140, sandbox 7), lint, build; live E2E with Docker sandbox + real Gemini; browser smoke for teacher and student pages.
- **Not done (out of demo scope):** DSE-39 teacher progress dashboard; DSE-53 course/class cards + notifications; draggable splitter/shortcuts (DSE-35); diff view/memory (DSE-23); CSV export/bulk re-run (DSE-38); test→criterion auto mapping (DSE-24); syntax highlighting/version compare (DSE-55).
- **Jira pending approval:** → Done: DSE-23, 24, 25, 26, 28, 31, 32, 33, 35, 36, 37, 38, 44, 45, 47, 54, 55. Keep In Progress: DSE-53. Untouched: DSE-39.
- **Run demo:** `docker compose up -d`, `npm run seed`, `npm run sandbox`, `SANDBOX_API_URL=http://localhost:5010` in `BE/.env`, `npm run dev`, optional `npm run e2e` for demo data. Guide: `docs/user-guide.md`.
