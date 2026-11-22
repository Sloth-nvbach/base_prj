# Smart EdTech Domain

> Moved out of `AGENTS.md` §8 to keep the always-loaded file small. Read the part you need before touching assignments, submissions, grading, runs or AI review. Keep `AGENTS.md` §8 summary in sync.

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
- **Runs:** `POST /api/submissions/:id/run` queues a sandbox run (BullMQ), `GET /api/submissions/:id/run-result` polls; max `MAX_CONCURRENT_RUNS_PER_USER` (5) concurrent per user. `server.ts` starts the BullMQ worker only when `SANDBOX_API_URL` is set (Redis via `REDIS_HOST`/`REDIS_PORT`/`REDIS_PASSWORD`). The runner is the separate `sandbox/` service (`POST /api/sandbox/run`, one container per test case, JavaScript, TypeScript (types stripped, not checked), Python); keep its limits in `sandbox/runner.mjs`.
- **AI review** (`ai-review.service.ts`, prompt in `config/ai-review.ts`): `POST /api/submissions/:id/ai-review` (assignment teacher/admin, 5/min/user) → issues (lines, snippet, cause, fix steps, concepts), per-criterion suggestions (unknown ids dropped, scores clamped), `suggestedScore`, draft feedback, confidence. Stored in `submission.aiReview` only — never the score; hidden test inputs never sent.
- **FE pages:** teacher/admin — `/assignments`, `/assignments/:id` (details, test cases, rubric tabs), `/submissions` (grading queue), `/submissions/:id/grade` (split screen: problem + code | test results, AI review, grade form). Students — `/my-assignments` (status, attempts, best score, due colors), `/my-assignments/:id` (problem, submit → auto run, history), `/my-submissions/:id` (code, test results, rubric, feedback; polls `?job=`). Module `FE/src/modules/submission/` (`TestResultsTable`, `CodeViewer`, `AiReviewPanel`, `GradingPanel`; `computeRubricScore` mirrors the BE formula).
- **AI integration:** dedicated service, keys from `BE/.env` only, provider-swappable, timeouts + input size limits + malformed-response handling. No credentials → build structure + document config, never fake calls.
- **AI feedback (pedagogy):** explain issue, location, root cause, step-by-step hints, concepts to review, confidence/limits. No full solutions unless assignment policy + Jira require it.
- **Score suggestions:** per rubric criterion with explanation; AI-suggested ≠ teacher-final; teacher reviews/confirms; never auto-publish.
- **Code safety:** student code is untrusted — never execute on the Node server; only via sandbox (limits, timeouts, no network). Static analysis tasks don't need execution.
