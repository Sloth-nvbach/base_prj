---
description: Create a new feature (backend API + frontend page + tests) from the notes reference module
---

1. Ask the user for the feature name (singular, lowercase, words joined by "-", e.g. `product`, `lesson-plan`) and the fields it needs (name, type, required or optional). If the user already gave them, do not ask again.
2. Read `AGENTS.md`, section "Adding a feature".
3. Run `npm run gen:module -- <name>` from the repository root. If the plural is irregular, add `--plural <plural>`.
4. Replace the example fields `title`, `content`, `tags` with the user's fields in every file listed in `AGENTS.md` step 2. Keep the backend validator, the frontend types and the form schema consistent.
5. Update the generated tests for the new fields:
   - `BE/tests/integration/<plural>.test.ts`
   - `FE/src/modules/<plural>/pages/<Plural>ListPage.test.tsx`
6. Run `npm test`, `npm run lint` and `npm run build`. Fix every failure.
7. Tell the user which page to open (`http://localhost:5173/<plural>`) and summarise the files changed.
