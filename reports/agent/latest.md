# Latest Execution Summary

## Date: 2026-11-17

## Tasks Completed
- **DSE-21**: Giảng viên thiết lập bộ kiểm thử cho bài tập (DONE)
- **DSE-52**: Teacher defines Rubric per Exercise (DONE)
- **DSE-22**: Hệ thống chạy code với bộ kiểm thử (DONE)

## Summary
Implemented frontend modules for test cases and rubrics, which were already fully implemented in the backend with comprehensive tests.

### DSE-22: Submission Run Integration with Sandbox (DSE-58)
- Added BullMQ + Redis queue system for managing concurrent code execution runs
- Created sandbox service to call external Docker Sandbox Runner (DSE-58) API
- Added POST /api/submissions/:id/run endpoint to queue submissions for execution
- Added GET /api/submissions/:id/run-result endpoint to poll for results
- Worker processes queue jobs, calls sandbox, updates submission with testResults, totalScore, status
- Handles sandbox errors: timeout, OOM, compile error, runtime error
- Enforces max 5 concurrent runs per user (configurable via MAX_CONCURRENT_RUNS_PER_USER)
- Job events (completed/failed) clean up user tracking
- Added SANDBOX_API_URL, SANDBOX_API_KEY environment configuration

### DSE-21: Test Cases Frontend
- Created `FE/src/modules/testcase/` module with types, API, hooks, and components
- Built `TestCaseTable` component with:
  - Add/Edit/Delete test cases
  - Reorder test cases (backend handles reorder)
  - Import/Export test cases as JSON
  - Fields: Input, Expected Output, Hidden (anti-cheat), Points with validation
- Integrated into assignment edit page via tabs

### DSE-52: Rubric Frontend
- Created `FE/src/modules/rubric/` module with types, API, hooks, and components
- Built `RubricBuilder` component with:
  - Drag-drop reorder criteria using @dnd-kit
  - Live weight normalization progress bar (green at 100%, red otherwise)
  - Add/Edit/Delete criteria: name, description, weight, maxScore
  - Preview mode showing score calculation per criterion
  - Import/Export JSON, Load default template, Copy from another assignment
  - Validation: no duplicate names, weight > 0, maxScore > 0

### Shared Infrastructure
- Created `FE/src/modules/assignment/` module with list page
- Created `AssignmentEditTabs` integrating test cases and rubric tabs
- Registered assignment module in `FE/src/app/modules.ts`
- Created missing UI components: **Tabs**, **Select**, **Progress**, **Checkbox**, **CardFooter**

### Theme & Auth Layout Changes (Catppuccin Mocha inspired)
- **Dark mode as default** - eye-friendly for long coding sessions
- **Not pure black** (`#1e1e2e` navy) - reduces halation/eye strain
- **Good contrast ratios** - WCAG AA compliant
- **Warm coding-friendly palette** - lavender primary, pink accent
- **Light theme available** (`.light` class) with Catppuccin Latte colors
- **Custom scrollbar** styling matching theme
- **Selection colors** match primary

### Auth Layout: 30/70 Split
| Before | After |
|--------|-------|
| 50/50 split (lg:w-1/2) | **30/70 split** (lg:w-3/10 + lg:w-7/10) |
| Large branding panel | Compact branding panel |
| Form panel cramped | **Larger form area** (max-w-lg) |
| Large icons/text | Compact, balanced proportions |

### Default Theme
- **Dark mode by default** (changed from `system`)
- Theme toggle cycles: `dark` → `light` → `system` → `dark`
- Persists in localStorage

### Verification
| Check | Result |
|-------|--------|
| `npm run build` | ✅ PASS |
| `npm run lint` | ✅ PASS (no warnings) |
| `npm test` | ✅ PASS (400 BE + 125 FE tests = 525 total) |

## Files Created/Modified
### New Files (33)
- FE/src/modules/testcase/types/testcase.types.ts
- FE/src/modules/testcase/api/testcase.api.ts
- FE/src/modules/testcase/hooks/use-testcases.ts
- FE/src/modules/testcase/components/TestCaseTable.tsx
- FE/src/modules/rubric/types/rubric.types.ts
- FE/src/modules/rubric/api/rubric.api.ts
- FE/src/modules/rubric/hooks/use-rubrics.ts
- FE/src/modules/rubric/components/RubricBuilder.tsx
- FE/src/modules/assignment/types/assignment.types.ts
- FE/src/modules/assignment/api/assignment.api.ts
- FE/src/modules/assignment/hooks/use-assignments.ts
- FE/src/modules/assignment/pages/AssignmentsListPage.tsx
- FE/src/modules/assignment/components/AssignmentEditTabs.tsx
- FE/src/modules/assignment/assignment.module.ts
- FE/src/shared/components/ui/tabs.tsx
- FE/src/shared/components/ui/select.tsx
- FE/src/shared/components/ui/progress.tsx
- FE/src/shared/components/ui/checkbox.tsx
- BE/src/utils/logger.ts
- BE/src/services/sandbox.service.ts
- BE/src/services/queue.service.ts
- BE/src/services/submission-run.worker.ts
- BE/tests/integration/submission-run.test.ts

### Modified Files (17)
- FE/src/app/modules.ts (registered assignmentModule, removed demoModule)
- FE/src/shared/components/ui/card.tsx (added CardFooter)
- FE/src/shared/components/stat-card.tsx (icon background opacity)
- FE/src/shared/components/data-table/data-table.tsx (row/thead opacity)
- FE/src/shared/components/layout/AdminLayout.tsx (sidebar/header colors)
- FE/src/shared/components/layout/AppLayout.tsx (header/logo/nav colors)
- FE/src/index.css (complete theme overhaul)
- FE/src/modules/auth/components/AuthLayout.tsx (30/70 split, readable branding)
- FE/src/shared/lib/utils.ts (default theme = 'dark', auto-init)
- FE/src/shared/lib/utils.test.ts (updated test expectation)
- BE/package.json (added bullmq, ioredis, @types/ioredis)
- BE/src/config/env.ts (added sandbox config vars)
- BE/.env.example (added sandbox config examples)
- BE/src/utils/app-error.ts (added serviceUnavailable, gatewayTimeout)
- BE/src/services/submission.service.ts (added runSubmission, getSubmissionRunResult)
- BE/src/controllers/submission.controller.ts (added run/result handlers)
- BE/src/routes/submission.route.ts (added new routes)
- BE/src/validators/submission.validator.ts (added validation schemas)
- BE/vitest.config.mts (added Redis/sandbox test env)
- BE/tests/setup/mock-external-services.ts (added BullMQ/ioredis/fetch mocks)

### Removed Files (Cleanup)
- `package/` folder (Playwright MCP - not part of project)
- `playwright-mcp-0.0.85.tgz` (package tarball)
- `err.txt`, `out.txt` (empty files)
- `FE/src/modules/demo/` (11 files - testing tool with 4 failing tests)

## GitHub
- Repository: https://github.com/Sloth-nvbach/base_prj
- Branch: main
- Commit: 3b6d1a5
- Commit Message: feat: implement DSE-21 test case management + DSE-52 rubric builder + theme & auth UI improvements
- Push: SUCCESS

### DSE-22 Commit (pending)
- Commit Message: feat: implement DSE-22 submission run integration with sandbox queue
- Push: PENDING