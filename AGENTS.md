# AGENTS.md — Instructions for AI Coding Agents

> Single source of truth for AI agents working in this repo. Loaded every session — keep it short: one-line rules here, details and code examples in `BE/docs/architecture.md` and `FE/docs/architecture.md` (read the section you need, when you need it). Student guide (Vietnamese): `docs/vibe-coding-guide.md`.

## 1. Project

**Smart EdTech** — AI grading & teaching assistant for programming courses, built on the MERN Student Base.

| App | Stack |
|-----|-------|
| **BE/** | Express 5 + TypeScript + MongoDB (Mongoose 9) + Zod 4, JWT auth (optional email OTP), BullMQ + Redis run queue |
| **FE/** | React 19 + Vite + TypeScript + TanStack Query 5 + React Hook Form + Zod + shadcn/ui + Tailwind CSS 4 |

Implemented: auth (register OTP, login, forgot/reset, optional login OTP), profile + avatar (Cloudinary), roles `student`/`teacher`/`admin`, `notes` reference module, admin area (`/admin`), AI chat widget (Gemini), courses/classes/enrollments, assignments, submissions + sandbox runs, rubrics, test cases.

## 2. Golden Rules

1. **Base project for students.** Simple, readable code. Copy existing patterns (`notes`, admin users, chat) — no new architecture.
2. **Reuse before you write.** `validate`, `paginate`, `AppError` helpers, `DataTable`, `FormField`, query hooks… No new deps when a tool exists.
3. **Register, don't wire by hand.** BE routers → `BE/src/app.ts`. FE features → `FE/src/app/modules.ts`. Never add feature routes to `FE/src/App.tsx`.
4. **Never leak private data.** No passwords, OTP/reset tokens, API keys in responses, logs, or FE code.
5. **Do NOT change OTP functions:** `BE/src/utils/otp.ts`, `createUserWithOtp`, `issueOtpForUser`, `issueResetToken`, OTP/reset handlers in `auth.controller.ts`.
6. **Every change has tests.** Never weaken/delete tests to pass. Iterate with targeted tests; full `npm test` + `npm run lint` + `npm run build` once at the end (§9).
7. **Keep docs true.** Changed a rule/helper/convention → update this file + matching `docs/architecture.md` in the same change.

## 3. Commands (repo root)

| Command | Description |
|---------|-------------|
| `npm run setup` | Install deps, create `BE/.env` & `FE/.env` from examples |
| `docker compose up -d` | Local MongoDB :27017 + Redis :6379 (run queue) |
| `npm run seed` | Creates missing demo accounts and repairs demo accounts with a legacy role: `demo@example.com/demo1234`, `admin@example.com/admin1234`, `teacher@example.com/teacher1234`, `student01..12@example.com/student1234`. Refuses `NODE_ENV=production` |
| `npm run dev` | BE http://localhost:5003 + FE http://localhost:5173 |
| `npm test` / `npm run lint` / `npm run build` | Full check (BE+FE tests, FE ESLint, typecheck+build) |
| `npm test --prefix BE -- <pattern>` / `npm test --prefix FE -- <pattern>` | Targeted tests while iterating |
| `npm run sandbox:pull` then `npm run sandbox` | Pull language images once; start the code runner `sandbox/` on :5010 (needs Docker; reads `BE/.env`) |
| `npm run e2e` | Live end-to-end check of the grading flow against the running stack (also creates demo data); user guide: `docs/user-guide.md` |
| `npm run gen:module -- <name> [--remove]` | Scaffold (or delete) feature BE+FE+tests from `notes` (kebab-case for multi-word) |

Optional services: no SMTP → emails printed to BE console (dev) / 503 (prod); no Cloudinary → upload 503; no `GEMINI_API_KEY` → chat 503; no `SANDBOX_API_URL` → run 503. Tests never read `BE/.env` (vars in `BE/vitest.config.mts`).

## 4. Adding a Feature

`npm run gen:module -- <name>`, then change example fields (`title`, `content`, `tags`) in sync across: `BE/src/models/<name>.model.ts`, `BE/src/validators/<name>.validator.ts`, `FE/src/modules/<plural>/types/<name>.types.ts`, `.../components/<Name>FormDialog.tsx`, `.../components/<Name>Card.tsx`, and the generated tests. Optional admin page → §7. Reference: `BE/src/{models,validators,services,controllers,routes}/note.*`, `FE/src/modules/notes/`.

## 5. Backend Rules (details: `BE/docs/architecture.md`)

Layers, strictly top-down: `routes` → `middlewares` (`authGuard` → `requireRole` → `validate` → `imageUpload`) → `controllers` → `services` → `models`; `config/` (env, clients), `utils/` (pure helpers, never import services).

| Layer | Owns | Must NOT |
|-------|------|----------|
| routes | URL + verb + middleware chain | contain logic |
| controllers | req/res, status codes | query beyond one trivial call; try/catch (Express 5 forwards rejections) |
| services | queries, access rules, workflows, side effects | touch `req`/`res` |
| models | schema, constraints, indexes, `toJSON` hiding private fields | HTTP concerns |
| validators | Zod schemas + inferred types | run queries |

- **Env:** only `config/env.ts` reads `process.env` (one Zod schema). New vars → schema + `.env.example`. Prod: `JWT_SECRET` ≥ 32 chars, not example value.
- **Validation:** `validate({ body?, query?, params? })` → failures `400 { message: 'Validation failed', errors: [{ field, message }] }`. Common schemas in `validators/common.validator.ts`: `idParamsSchema`, `objectIdSchema`, `paginationQuerySchema`, `sortSchema([...])`, `booleanQuerySchema`, `optionalBooleanQuerySchema`, `bulkIdsSchema`.
- **Auth:** `authGuard` sets `req.user = { sub, email }`; `requireRole(...)` loads role from DB, sets `req.user.role`, else 403. Login OTP: 202 `{ message, requiresOtp, email }`; toggle via `PATCH /api/profile/security`.
- **Services:** access via `accessFilter(actor, id)`; other users' resources → `notFound` (404, never reveal existence).
- **Lists:** extend `paginationQuerySchema`, allowlist sort with `sortSchema` (never private fields), return `paginate(Model, filter, query)` → `{ items, page, limit, total, totalPages }`. Escape user text before `RegExp`.
- **Errors:** throw `badRequest`/`unauthorized`/`forbidden`/`notFound`/`conflict`/`new AppError(status, msg)`. `errorMiddleware` maps Zod/ObjectId/Mongoose validation → 400, duplicate key → 409, JSON/file too large → 413, else 500 `{ message: 'Internal server error' }`.
- **Models:** `{ timestamps: true }`, DB constraints, indexes for default list query, `toJSON` strips `__v` + private fields. User `toJSON` strips `password`, `otpCode`, `otpExpiresAt`, `resetToken`, `resetTokenExpiresAt` (add new ones to `PRIVATE_USER_FIELDS`). `.lean()`/`aggregate()` skip `toJSON` → `.select()` public fields.
- **Responses:** read/update 200 resource; list 200 paginated; create 201; delete 204; 401/403/404/409/413/429/503 → `{ message }`. All routes under `/api`; `GET /health` → `{ ok: true }`.
- **Security:** bcrypt (`utils/hash`); OTP/reset single-use; rate limits 300/15 min global, 20/15 min on `/api/auth/*` except `/me` (off in tests), `TRUST_PROXY=1` behind proxy; uploads memory storage, 5 MB, JPEG/PNG/WebP/GIF.
- **External services:** `sendEmail(to, subject, html)`; `uploadImage(buffer, folder)` / `deleteImage(publicId)` (store `publicId`); Gemini via `@google/genai` only (never `@google/generative-ai`) in `services/ai.service.ts` — new AI features call `generateAiText` / `generateAiJson(request, zodSchema)` (provider-agnostic, input limit → 413, timeout → 504, malformed JSON → 502), never the SDK directly; sandbox via `services/sandbox.service.ts` + queue `services/queue.service.ts`.
- **Tests:** `tests/unit` (pure fns, middlewares), `tests/integration` (real app + in-memory MongoDB). Use `api()` (`tests/helpers/api.ts`), `createUser({ role, ... })` + `bearerFor(user)`, mocks `email-outbox.ts`, `cloudinary-recorder.ts`, `gemini-recorder.ts`. Model: `tests/integration/notes.test.ts`.

## 6. Frontend Rules (details: `FE/docs/architecture.md`)

- **Structure:** feature modules in `src/modules/<f>/` (`api/`, `hooks/`, `components/`, `pages/`, `types/`, `<f>.module.ts`). Promote to `shared/` only when a 2nd module needs it.
- **Naming:** kebab-case files/folders, PascalCase components/pages, named exports (only `App` default). API object `export const notesApi = { list, get, create, update, remove }`; descriptor `export const notesModule: AppModule`. Imports via `@/`.
- **HTTP:** only the shared Axios instance `shared/api/http.ts` (base URL from `VITE_API_BASE_URL`, adds Bearer token, 401 → `/logout`). Never `axios` directly or hardcoded URLs.
- **Server state:** only TanStack Query hooks with key factories + invalidation; never `useEffect`+`useState` fetching. Mutations without `onError` toast backend message automatically; 4xx never retried.
- **Auth:** `useCurrentUser()` / `useSetCurrentUser()` / `useLogout()`; token only via `tokenStore`.
- **Routing:** register `routes`, `navItems`, `adminRoutes`, `adminNavItems`, `widgets` in `<f>.module.ts` + one entry in `app/modules.ts`. `roles: [...]` restricts a route/nav item. Page number in URL via `usePagination()`.
- **Forms:** RHF + Zod (`useForm<z.input, unknown, z.output>`) + `FormField`; mirror BE validation; strip empty optional strings to `undefined`; disable submit on `isPending`; `useWatch` not `watch`.
- **Page states:** `LoadingState` / `ErrorState` (with retry) / `EmptyState`; `PageHeader`, `Pagination`, `ConfirmDialog` before delete, `useDebounce` for search.
- **Tables:** `DataTable` (column config, `sort`/`onSortChange`, `selectedIds`), `TableToolbar` + `SearchInput` + `FilterSelect`, `useListParams` keeps state in URL. Reference: `AdminUsersPage.tsx`.
- **UI:** shadcn/ui in `shared/components/ui/`, `cn()`, theme tokens only (no raw colors), `toast` from `sonner`.
- **Tests:** `*.test.tsx` next to code; `vi.mock` the feature api; `renderWithProviders(<Page />, { route, otherRoutes })`; assert what the user sees. Model: `NotesListPage.test.tsx`.

## 7. Admin Area & Chat

- **Admin:** `/admin` uses `AdminLayout` (sidebar); endpoints under `/api/admin` in `routes/admin.route.ts`. **Base default: every signed-in account can use it.** Lock = `requireRole('admin')` in `admin.route.ts` + `<ProtectedRoute roles={['admin']}>` around `AdminLayout` in `FE/src/App.tsx`. Keep checks that an account can't delete itself or drop its own admin role (`admin-user.service.ts`). Deleting a user deletes their notes + avatar. New admin page: BE list with `sortSchema`/`optionalBooleanQuerySchema`/`paginate`/`bulkIdsSchema`; FE `adminRoutes` + `adminNavItems`, built like `AdminUsersPage`.
- **Chat:** widget `FE/src/modules/chat/` (texts in `chat.config.ts`); `POST /api/chat` `{ messages: [{ role: 'user'|'model', text }] }` → `{ reply }`, stateless, `authGuard`, 10 req/min/user. Personality in `BE/src/config/chatbot.ts`. `GEMINI_MODEL` default `gemini-3.5-flash-lite`, thinking `LOW`. Errors: no key/bad key/model → 503, quota → 429, other → 502.

## 8. Smart EdTech Domain

| Model | Key fields / rules |
|-------|--------------------|
| `Course` | `code`, `name`, `description`, `createdBy` |
| `Class` | `course`, `teacher`, `students[]`, `semester`, `schedule` |
| `Enrollment` | `student`, `class`, `enrolledAt`, `status` |
| `Assignment` | `title`, `description`, `instructions`, `createdBy`, `dueDate?`, `maxScore` ≥ 0 (100), status `draft\|published\|closed` |
| `Submission` | `assignment`, `student`, `code`, `language` enum, `submittedAt`, status `submitted\|graded`, teacher-confirmed `score` ≥ 0 (≤ `maxScore`, never the AI suggestion), `feedback`. History kept (not unique) |
| `Rubric` | criteria (name, description, weight auto-normalized to Σ=100); default template endpoint |
| `TestCase` / `TestResult` | `assignment`, `input`, `expectedOutput`, `isHidden` (input/expected output never shown to students, but always graded in runs), `points` / per-submission results |

- **Assignments** (`assignment.service.ts`): teachers create/edit/delete own (others' → 404), admins any. Students read published/closed; teachers own (incl. drafts); admins all. Drafts → 404, never 403.
- **Submissions** (`submission.service.ts`): students only, unlimited attempts. `GET /api/submissions?assignment=<id>` → caller's own, populated. `GET /api/assignments/:id/submission-access` → `{ canSubmit, reason? }`; closed/past deadline blocks `POST /api/submissions` (403). Students only ever get `toStudentView` (`grading.service.ts`): no `aiReview`/`gradeHistory`, no score/feedback before `graded`, hidden test output blanked.
- **Grading** (`grading.service.ts`, teacher of the assignment or admin, others 404): `GET /api/submissions/review` (queue), `GET /api/submissions/:id` (submission + assignment + student + test cases + rubric; students: own only), `POST /:id/grade` (draft; rubric → `criterionScores` per criterion, score = Σ(score/max·weight)/Σweight·assignment.maxScore; no rubric → `score`), `POST /:id/finalize` (status `graded`, `gradedAt/By`, locked except admins, emails student). Every save appends `gradeHistory`. Runs never change `status`/`score`/`feedback` — they write `runStatus`, `runMessage`, `testResults`, `totalScore`.
- **Runs:** `POST /api/submissions/:id/run` queues a sandbox run (BullMQ), `GET /api/submissions/:id/run-result` polls; max `MAX_CONCURRENT_RUNS_PER_USER` (5) concurrent per user. `server.ts` starts the BullMQ worker only when `SANDBOX_API_URL` is set (Redis via `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`). The runner is the separate `sandbox/` service (`POST /api/sandbox/run`, one container per test case, JS + Python); keep its limits in `sandbox/runner.mjs`.
- **AI review** (`ai-review.service.ts`, prompt in `config/ai-review.ts`): `POST /api/submissions/:id/ai-review` (assignment teacher/admin, 5/min/user) → issues (lines, snippet, cause, fix steps, concepts), per-criterion suggestions (unknown ids dropped, scores clamped), `suggestedScore`, draft feedback, confidence. Stored in `submission.aiReview` only — never the score; hidden test inputs never sent.
- **FE pages:** teacher/admin — `/assignments`, `/assignments/:id` (details, test cases, rubric tabs), `/submissions` (grading queue), `/submissions/:id/grade` (split screen: problem + code | test results, AI review, grade form). Students — `/my-assignments` (status, attempts, best score, due colors), `/my-assignments/:id` (problem, submit → auto run, history), `/my-submissions/:id` (code, test results, rubric, feedback; polls `?job=`). Module `FE/src/modules/submission/` (`TestResultsTable`, `CodeViewer`, `AiReviewPanel`, `GradingPanel`; `computeRubricScore` mirrors the BE formula).
- **AI integration:** dedicated service, keys from `BE/.env` only, provider-swappable, timeouts + input size limits + malformed-response handling. No credentials → build structure + document config, never fake calls.
- **AI feedback (pedagogy):** explain issue, location, root cause, step-by-step hints, concepts to review, confidence/limits. No full solutions unless assignment policy + Jira require it.
- **Score suggestions:** per rubric criterion with explanation; AI-suggested ≠ teacher-final; teacher reviews/confirms; never auto-publish.
- **Code safety:** student code is untrusted — never execute on the Node server; only via sandbox (limits, timeouts, no network). Static analysis tasks don't need execution.

## 9. Workflow (per Jira task)

1. **Context (cheap first):** `git status` + `git log -5`. Read `reports/agent/latest.md`, then only *Next Steps* + last *Session History* row of `reports/agent/jira/<ID>.md` if it exists. Don't re-read README/AGENTS.md.
2. **Jira (project DSE, cloudId `https://nvb3117.atlassian.net`, never call `getAccessibleAtlassianResources`, `maxResults: 10`):** read the issue with compact view (summary, description, AC, comments, status). Open Epic/linked/sprint only when the AC or description references them.
3. **Implement** within task scope; run targeted tests while iterating.
4. **Verify once at the end:** `npm test` && `npm run lint` && `npm run build`. Docs-only changes skip this.
5. **Report:** new task → copy `reports/agent/TEMPLATE.md` to `reports/agent/jira/<ID>.md` and add it to `reports/agent/README.md`. Append a session entry (never delete old entries; fix wrong info with a dated correction). Overwrite `latest.md` (≤ 20 lines: active task, status, next steps, blockers). Don't record commit hashes — `git log` is the truth.
6. **Commit & push (no approval needed) after step 4 passes:** review `git diff`, stage only task files (never `.env`, secrets, personal data, junk generated files), Conventional Commit (`feat:`, `fix:`, `docs:`…), code + report in **one** commit, push to the current branch.
7. **Handoff:** Jira ID + DONE/PARTIAL/BLOCKED, files changed, test results, report path, Jira pending actions, commit/push result, blockers. Keep "code done" ≠ "Jira updated" ≠ "committed" ≠ "pushed" distinct; never claim unverified results.

**Needs explicit user approval first:**
- Any Jira write (issue, description, AC, comment, assignee, priority, status, links, sprint). Show a preview: issue, action, current state, proposed change, reason. Code approval ≠ Jira approval.
- High-risk Git: force-push, delete branch/repo, rewrite history, merge PR, branch protection, prod deploy, overwriting/deleting the user's uncommitted changes, auto switching branch. Push rejected → fetch & analyze, then ask; never auto reset/rebase/force.

**Blocked / missing tools or services:** do the independent safe parts, document limits in the report, don't claim success.

**Done** = AC met, no placeholders in main flow, validation/errors/security handled, full check passed, no regressions, docs + report updated, Jira/Git states reported accurately.
