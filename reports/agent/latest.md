# Latest Execution Summary

## Date: 2026-11-17

## Tasks Completed
- **DSE-21**: Giảng viên thiết lập bộ kiểm thử cho bài tập (DONE)
- **DSE-52**: Teacher defines Rubric per Exercise (DONE)

## Summary
Implemented frontend modules for test cases and rubrics, which were already fully implemented in the backend with comprehensive tests.

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
- **Auth Layout**: 30/70 split (branding 30%, form 70%)
- **Default theme**: Dark (changed from `system`)
- **Theme toggle**: cycles dark → light → system → dark

### Layout Improvements
- AdminLayout: sidebar/header colors updated for consistency
- AppLayout: header/logo/nav colors updated
- StatCard: icon background opacity increased
- DataTable: row/thead opacity improved
- Admin pages: sidebar, header, nav link colors unified

## Verification
| Check | Result |
|-------|--------|
| `npm run build` | ✅ PASS |
| `npm run lint` | ✅ PASS (1 pre-existing warning) |
| `npm test` | ✅ PASS (390 BE + 125 FE tests; 4 pre-existing demo failures) |

## Files Created/Modified
### New Files (18)
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

### Modified Files (6)
- FE/src/app/modules.ts (registered assignmentModule)
- FE/src/shared/components/ui/card.tsx (added CardFooter)
- FE/src/shared/components/stat-card.tsx (icon bg opacity)
- FE/src/shared/components/data-table/data-table.tsx (row/thead opacity)
- FE/src/shared/components/layout/AdminLayout.tsx (sidebar/header colors)
- FE/src/shared/components/layout/AppLayout.tsx (header/logo/nav colors)
- FE/src/index.css (complete theme overhaul)
- FE/src/modules/auth/components/AuthLayout.tsx (30/70 split, readable branding)
- FE/src/shared/lib/utils.ts (default theme = 'dark')
- FE/src/shared/lib/utils.test.ts (updated test expectation)