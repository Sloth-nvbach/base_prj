# DSE-27 — Xây dựng dịch vụ kết nối API mô hình AI

## 1. General Info
- Jira ID: DSE-27 (Epic DSE-4 — Trợ giảng AI)
- Project / Sprint: DSE / Sprint 5: Core Grading (Sandbox + Score + AI)
- Date: 2026-11-18
- Status: DONE
- Repository / Branch: Sloth-nvbach/base_prj / main

## 2. Objective & Acceptance Criteria
Jira has no description/AC. Scope taken from Epic DSE-4 (re-scoped 18/11): AI service reusing existing Gemini `ai.service.ts`, base for DSE-28/31/32/33. AGENTS §8: provider-swappable, keys server-side, timeouts, input size limit, malformed-response handling.

## 3. Initial Survey
`ai.service.ts` only had `generateChatReply` (Gemini SDK called inline, no timeout, no size limit, no JSON support).

## 4. Execution Log
- 2026-11-18: Added `AiRequest` + `AiProvider` interface, Gemini provider, `generateAiText` (503 not configured, 413 input > 40k chars, 504 after 30 s via AbortSignal, 429/503/502 mapping unchanged) and `generateAiJson(request, zodSchema)` (JSON mime type, strips ``` fences, 502 on malformed/wrong shape). `generateChatReply` now uses `generateAiText`; chat behaviour unchanged.

## 5. Files Changed
| File | Action | Description |
|------|--------|-------------|
| BE/src/services/ai.service.ts | MODIFY | Provider abstraction, limits, JSON helper |
| BE/tests/unit/ai-service.test.ts | MODIFY | JSON ok/fenced, malformed → 502, 413, 504 |
| BE/tests/integration/chat.test.ts | MODIFY | Request now carries `abortSignal` |
| BE/tests/helpers/gemini-recorder.ts, BE/tests/setup/mock-external-services.ts | MODIFY | `hang` option for timeout test |
| AGENTS.md, BE/docs/architecture.md | MODIFY | Document AI entry points |

## 6. Testing & Verification
| Test | Command / Method | Result | Notes |
|------|------------------|--------|-------|
| Lint | `npm run lint` | PASS | |
| Unit + Integration | `npm test` | PASS | BE 406, FE 125, sandbox 7 |
| Build | `npm run build` | PASS | |
| Real Gemini call | — | NOT RUN | needs `GEMINI_API_KEY`; mocked in tests |

## 7. Acceptance Criteria
| Criteria | Status | Evidence |
|----------|--------|----------|
| Reusable AI service on top of Gemini | PASS | `generateAiText`, `generateAiJson` |
| Provider swap without changing callers | PASS | `AiProvider` interface |
| Timeout / size limit / malformed response | PASS | unit tests |

## 8. Jira
- Status before: In Progress. Proposed: → Done. Executed 2026-11-18 (user approved): In Progress → Done.

## 9. GitHub
- Branch: main
- Commit message: feat: DSE-27 AI service connection layer + DSE-58 docker sandbox runner

## 10. Blockers & Remaining Work
None.

## 11. Next Steps
DSE-28 (code analysis prompt) and DSE-32 (rubric score suggestion) should call `generateAiJson` with a Zod schema.

## 12. Session History
| Date | Progress | Changes | Status |
|------|----------|---------|--------|
| 2026-11-18 | Implemented + tested | ai.service.ts, tests, docs | DONE |
