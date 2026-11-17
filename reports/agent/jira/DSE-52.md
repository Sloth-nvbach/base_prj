# DSE-52 — Teacher defines Rubric per Exercise

## 1. General Info
- Jira ID: DSE-52
- Project / Sprint: DSE / Sprint 4
- Date: 2026-11-17
- Status: DONE
- Repository / Branch: base_prj / main

## 2. Objective & Acceptance Criteria
UI: Giảng viên thêm/sửa/xóa tiêu chí chấm cho từng bài tập. Weight tự động normalize = 100%. Preview rubric khi chấm.

**Acceptance Criteria:**
- [x] Rubric builder UI in Assignment edit page
- [x] Add criterion: name, description, weight, maxScore
- [x] Drag-drop reorder criteria
- [x] Live weight normalization indicator (progress bar to 100%)
- [x] Preview mode: shows how scores calculate
- [x] Copy rubric from another assignment
- [x] Validation: no duplicate names, weight > 0, maxScore > 0

## 3. Initial Survey
**Backend (IMPLEMENTED):**
- Model: `RubricDocument` with criteria (name, description, weight, maxScore, order) - auto-normalizes weights to 100%
- Validator: `createRubricSchema`, `updateRubricSchema`, `listRubricsQuerySchema`
- Service: `listRubrics`, `getRubric`, `getRubricById`, `createOrUpdateRubric`, `updateRubric`, `deleteRubric`, `getDefaultRubric`
- Controller: All CRUD operations
- Routes: All endpoints under `/api/rubrics` (mounted at `/api/rubrics` in app.ts)
- Tests: `BE/tests/integration/rubrics.test.ts` - comprehensive coverage

**Frontend (IMPLEMENTED):**
- Created `FE/src/modules/rubric/` with types, API, hooks, components
- `RubricBuilder` component with drag-drop, live weight normalization, preview, copy from assignment
- Integrated into assignment edit page via tabs

## 4. Execution Log
- 2026-11-17: Started task. Read AGENTS.md, fetched Jira issues DSE-21 and DSE-52. Analyzed codebase.
- Backend is fully implemented with tests passing.
- Created frontend module for rubrics (`FE/src/modules/rubric/`)
- Created `RubricBuilder` component with:
  - Drag-drop reorder using @dnd-kit
  - Live weight normalization progress bar
  - Preview mode showing score calculation
  - Import/Export JSON
  - Load default rubric template
  - Copy rubric from another assignment
  - Validation: no duplicate names, weight > 0, maxScore > 0
- Integrated rubric into assignment edit page via `AssignmentEditTabs`
- Installed @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities
- Created missing UI components (tabs, select, progress, checkbox)
- All build, lint, and backend tests pass.

## 5. Files Changed
| File | Action | Description |
|------|--------|-------------|
| FE/src/modules/rubric/types/rubric.types.ts | CREATE | TypeScript types for Criterion, Rubric, inputs |
| FE/src/modules/rubric/api/rubric.api.ts | CREATE | API functions for rubric CRUD, copy, default |
| FE/src/modules/rubric/hooks/use-rubrics.ts | CREATE | TanStack Query hooks for rubrics |
| FE/src/modules/rubric/components/RubricBuilder.tsx | CREATE | UI component for rubric management |
| FE/src/modules/assignment/types/assignment.types.ts | CREATE | TypeScript types for Assignment |
| FE/src/modules/assignment/api/assignment.api.ts | CREATE | API functions for assignment CRUD |
| FE/src/modules/assignment/hooks/use-assignments.ts | CREATE | TanStack Query hooks for assignments |
| FE/src/modules/assignment/pages/AssignmentsListPage.tsx | CREATE | Assignment list page with search, filter, pagination |
| FE/src/modules/assignment/components/AssignmentEditTabs.tsx | CREATE | Tab component integrating test cases and rubric |
| FE/src/modules/assignment/assignment.module.ts | CREATE | Module registration for assignments |
| FE/src/app/modules.ts | EDIT | Registered assignmentModule |
| FE/src/shared/components/ui/tabs.tsx | CREATE | Tabs UI component |
| FE/src/shared/components/ui/select.tsx | CREATE | Select UI component |
| FE/src/shared/components/ui/progress.tsx | CREATE | Progress bar UI component |
| FE/src/shared/components/ui/checkbox.tsx | CREATE | Checkbox UI component |

## 6. Testing & Verification
| Test | Command / Method | Result | Notes |
|------|------------------|--------|-------|
| Lint | npm run lint | PASS | Only pre-existing warning in demo module |
| Unit test | npm test | PASS | Backend 390 tests pass, frontend 125 tests pass (4 pre-existing failures in demo module) |
| Build | npm run build | PASS | Both BE and FE build successfully |
| Integration | npm test | PASS | Backend integration tests for rubrics all pass |

## 7. Acceptance Criteria
| Criteria | Status | Evidence |
|----------|--------|----------|
| Rubric builder UI in Assignment edit page | PASS | RubricBuilder component in AssignmentEditTabs |
| Add criterion: name, description, weight, maxScore | PASS | Form fields in RubricBuilder |
| Drag-drop reorder criteria | PASS | @dnd-kit implementation |
| Live weight normalization indicator (progress bar to 100%) | PASS | Progress bar with color coding |
| Preview mode: shows how scores calculate | PASS | Score calculation table in RubricBuilder |
| Copy rubric from another assignment | PASS | Copy dialog with assignment selector |
| Validation: no duplicate names, weight > 0, maxScore > 0 | PASS | Both backend and frontend validation |

## 8. Jira
- Status before/after (if verified): In Progress → Done (code complete)
- Proposed actions: None (read-only access)
- Approved & executed: N/A
- Still pending: N/A

## 9. GitHub
- Repository / Branch: base_prj / main
- Commit Status: COMMITTED & PUSHED
- Commit Hash / URL: 3b6d1a5 / https://github.com/Sloth-nvbach/base_prj/commit/3b6d1a5
- Commit Message: feat: implement DSE-21 test case management + DSE-52 rubric builder + theme & auth UI improvements
- Push result: SUCCESS

## 10. Blockers & Remaining Work
- None

## 11. Next Steps
- No further work needed for this task

## 12. Session History
| Date | Progress | Changes | Status |
|------|----------|---------|--------|
| 2026-11-17 | Initial survey, backend analysis | Created report | PARTIAL |
| 2026-11-17 | Implemented frontend for rubrics | Created rubric module, RubricBuilder, AssignmentEditTabs, assignment module | DONE |