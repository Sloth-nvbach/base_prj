---
description: Create a new feature (backend API + frontend page + tests) from the notes reference module
---

1. Ask the user for the feature name (singular, lowercase, words joined by "-", e.g. `product`, `lesson-plan`) and the fields it needs (name, type, required or optional). If the user already gave them, do not ask again.
2. Use `AGENTS.md` §4 "Adding a Feature" (already loaded — don't re-read the file).
3. Run `npm run gen:module -- <name>` from the repository root. If the plural is irregular, add `--plural <plural>`.
4. Replace the example fields `title`, `content`, `tags` with the user's fields in every file listed in `AGENTS.md` §4. Keep the backend validator, the frontend types and the form schema consistent.
5. Update the generated tests for the new fields:
   - `BE/tests/integration/<plural>.test.ts`
   - `FE/src/modules/<plural>/pages/<Plural>ListPage.test.tsx`
6. Iterate with targeted tests (`npm test --prefix BE -- <plural>`, `npm test --prefix FE -- <Plural>`), then run `npm test`, `npm run lint` and `npm run build` once. Fix every failure.
7. Tell the user which page to open (`http://localhost:5173/<plural>`) and summarise the files changed.
