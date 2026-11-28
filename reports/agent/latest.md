# Latest — 2026-11-28

> Overwritten each session (≤ 20 lines). Full history lives in `jira/<ID>.md` and `git log`.

- **Active:** FE UI redesign ("Night shift" theme) — DSE-59, report `jira/DSE-59.md`. Code DONE, `npm run check` PASS (BE 422, FE 142, sandbox 8, lint, build). Committed + pushed 2026-11-28.
- **Jira:** DSE-59 created 2026-11-28 (To Do); status change needs separate approval.
- **Login problem (2026-11-28), not a code bug:**
  - Old agent `npm run dev` processes still hold :5003/:5173 → user's FE moved to :5174 → CORS (`CLIENT_URL` = :5173) blocks login. Resolved: the old processes are gone (ports free on 2026-11-28); rerun `npm run dev` and open :5173.
  - Three MongoDBs on :27017 (Windows `mongod` on 127.0.0.1, Docker + WSL on ::1) with different data. `localhost` → Docker. Pick one DB (`MONGO_URI=mongodb://127.0.0.1:27017/...` or stop the other).
- **BE review 2026-11-28:** live API flows (auth, OTP, reset, profile, notes, admin, chat, grading e2e) all PASS; no BE code bug.
- **Next:** DSE-59 status change (needs approval); open follow-ups: wide tables scroll on phones, `DropdownMenu` keyboard support.
- **Previous (2026-11-23):** grading demo scope done and pushed — see `jira/DSE-44-47.md`.
