# Latest — 2026-11-18

> Overwritten each session (≤ 20 lines). Full history lives in `jira/<ID>.md` and `git log`.

- **Last done:** DSE-58 verified live on Docker + end-to-end (BE → Redis queue → runner → Mongo). Fixed: run worker never started; Redis config moved to `config/env.ts`; Redis in docker-compose. DSE-27 Done on Jira.
- **Active task:** none.
- **Open decisions:** 13 legacy `role: 'user'` accounts in dev DB get 403 on student endpoints. (Hidden test cases: now graded, 2026-11-18.)
- **Jira:** DSE-27 and DSE-58 Done (2026-11-18).
- **Run locally:** `docker compose up -d`, `npm run sandbox:pull`, `npm run sandbox`, `SANDBOX_API_URL=http://localhost:5010` in `BE/.env`, `npm run dev`.
- **Next:** DSE-28 / DSE-32 on top of `generateAiJson`.
