# AGENTS.md — Instructions for AI Coding Agents

> **Single source of truth** for AI agents (Antigravity, Claude Code, Codex, Cursor, ...) working in this repository.
> Combines: base project conventions + Smart EdTech project specifics.
> Details & examples: `BE/docs/architecture.md`, `FE/docs/architecture.md`.
> Student guide (Vietnamese): `docs/vibe-coding-guide.md`.

---

## 1. Project Overview

**Smart EdTech** — AI-powered grading & teaching assistant platform for programming courses.
Built on a **MERN Student Base** starter (this repo).

| App | Stack |
|-----|-------|
| **BE/** | Express 5 + TypeScript + MongoDB (Mongoose 9) + Zod 4. JWT auth with optional email OTP. |
| **FE/** | React 19 + Vite + TypeScript + TanStack Query 5 + React Hook Form + Zod + shadcn/ui + Tailwind CSS 4. |

**Key features already implemented:**
- Auth: register (OTP), login, forgot/reset password, optional OTP at login
- Profile: edit, avatar upload (Cloudinary)
- Roles: `user` / `admin` with `requireRole`
- Module `notes`: full CRUD, pagination, search, tag filter, ownership
- Admin area (`/admin`): dashboard + user management (search, filters, sort, pagination, bulk delete)
- AI Chat bot (Gemini free tier): floating widget, customizable personality

---

## 2. Golden Rules (MUST FOLLOW)

1. **Base project for students.** Keep code simple, readable. Copy existing patterns (`notes`, admin users, chat) — don't invent new architecture.
2. **Reuse before you write.** Use shared helpers: `validate`, `paginate`, `AppError`, `DataTable`, `FormField`, query hooks, etc. No new deps when a tool exists.
3. **Register, don't wire by hand.** Backend routers → `BE/src/app.ts`. Frontend features → `FE/src/app/modules.ts` (routes, nav, admin, widgets). Never add routes to `FE/src/App.tsx`.
4. **Never leak private data.** No passwords, OTP/reset tokens, API keys in responses, logs, or frontend code.
5. **Do NOT change OTP functions:** `BE/src/utils/otp.ts`, `createUserWithOtp`, `issueOtpForUser`, `issueResetToken`, OTP/reset handlers in `BE/src/controllers/auth.controller.ts`.
6. **Every change has tests.** Done only when `npm test`, `npm run lint`, `npm run build` pass from root. Never weaken/delete tests to pass.
7. **Keep docs true.** If you change a rule, helper, or convention → update this file + matching `docs/architecture.md` in same change.

---

## 3. Commands (run from repository root)

| Command | Description |
|---------|-------------|
| `npm run setup` | Install deps (root, BE, FE), create `BE/.env` & `FE/.env` from examples |
| `docker compose up -d` | Start local MongoDB on port 27017 |
| `npm run seed` | Demo accounts: `demo@example.com/demo1234`, `admin@example.com/admin1234`, `teacher@example.com/teacher1234`, 12 students `student01..12@example.com/student1234` |
| `npm run dev` | Run BE (http://localhost:5003) + FE (http://localhost:5173) together |
| `npm test` | Backend (Vitest + in-memory MongoDB) + Frontend (Vitest + Testing Library) |
| `npm run lint` | ESLint on frontend |
| `npm run build` | Typecheck + build both apps |
| `npm run gen:module -- <name>` | Scaffold new feature (BE+FE+tests) from `notes` module |
| `npm run gen:module -- <name> --remove` | Delete generated feature |

**Optional services:** Without SMTP → emails printed to BE terminal (dev) / 503 (prod). Without Cloudinary → image upload 503. Without `GEMINI_API_KEY` → chat 503. Everything else works. `npm run seed` refuses `NODE_ENV=production`. Tests never read `BE/.env` (vars in `BE/vitest.config.mts`).

---

## 4. Adding a Feature (follow in order)

```bash
npm run gen:module -- product            # creates BE+FE+tests from notes
npm run gen:module -- lesson-plan        # kebab-case for multi-word
npm run gen:module -- product --remove   # undo
```

Then change the example fields (`title`, `content`, `tags`). Keep these files in sync:

| File | Purpose |
|------|---------|
| `BE/src/models/<name>.model.ts` | Mongoose schema + `<Name>Document` interface |
| `BE/src/validators/<name>.validator.ts` | Zod schemas: create / update / list query |
| `FE/src/modules/<plural>/types/<name>.types.ts` | TypeScript types |
| `FE/src/modules/<plural>/components/<Name>FormDialog.tsx` | Form schema + inputs |
| `FE/src/modules/<plural>/components/<Name>Card.tsx` | Item display |

Update generated tests (`BE/tests/integration/<plural>.test.ts`, `FE/src/modules/<plural>/pages/*.test.tsx`).
Optional: add admin page (see §8).
Run `npm test`, `npm run lint`, `npm run build` — all must pass.

**Reference:** `BE/src/{models,validators,services,controllers,routes}/note.*` and `FE/src/modules/notes/`.

---

## 5. Backend Rules

### 5.1 Layered Architecture (strict top-to-bottom)

```
HTTP request
  → routes/           endpoints + middleware chain
  → middlewares/      authGuard → requireRole → validate → (imageUpload)
  → controllers/      read req, call service, shape res
  → services/         queries, ownership rules, side effects (email, cloudinary)
  → models/           Mongoose schemas
  → config/           env, db, cloudinary clients
  → utils/            app-error, pagination, jwt, hash, otp
```

| Layer | Owns | Must NOT |
|-------|------|----------|
| `routes/` | URL + verb + middleware chain | contain logic |
| `controllers/` | req/res handling, status codes | contain queries beyond one trivial call; be reused |
| `services/` | queries, access rules, workflows, side effects | touch `req`/`res` |
| `models/` | schema, constraints, `toJSON` hiding private fields | contain HTTP concerns |
| `validators/` | Zod schemas + inferred input types | run queries |
| `middlewares/` | auth, roles, validation, upload, errors | contain feature logic |
| `utils/` | pure helpers | import services |
| `config/` | env parsing, clients | contain feature logic |

### 5.2 Core Patterns

**Environment** (`config/env.ts`): Single Zod schema parses all vars; startup fails with all invalid vars listed. Prod: `JWT_SECRET` ≥ 32 chars, not example value. Add new vars to schema + `.env.example`. Never read `process.env` elsewhere.

**Routes → middleware chain:**
```ts
noteRouter.use(authGuard, requireRole('student', 'teacher', 'admin'));
noteRouter.get('/', validate({ query: listNotesQuerySchema }), listNotes);
noteRouter.patch('/:id', validate({ params: idParamsSchema, body: updateNoteSchema }), updateNote);
profileRouter.post('/avatar', authGuard, imageUpload.single('avatar'), uploadAvatar);
```
Mount in `app.ts`: `app.use('/api/<plural>', <name>Router)` (before `notFoundHandler`). `gen:module` does this.

**Validation** (`validate`): `validate({ body?, query?, params? })` parses each part with Zod, replaces with parsed value. Failures → `400 { message: 'Validation failed', errors: [{ field, message }] }`. `validateBody(schema)` shorthand.

**Auth & roles:**
- `authGuard` verifies `Authorization: Bearer <token>`, sets `req.user = { sub, email }`.
- `requireRole(...roles)` loads role from DB (promotions apply without re-login), sets `req.user.role`, 403 otherwise.
- Login: password check → if `user.loginOtpEnabled`, email OTP (202 `{ requiresOtp }`), else return `{ token }`. Toggle via `PATCH /api/profile/security`.

**Controllers — thin:**
```ts
const actorOf = (req: Request) => ({ id: req.user!.sub, role: req.user!.role });
export const updateNote = async (req: Request, res: Response) => {
  res.json(await noteService.updateNote(actorOf(req), req.params.id as string, req.body as UpdateNoteInput));
};
```
No try/catch — Express 5 forwards rejections to error handler.

**Services — queries & access rules:**
```ts
const accessFilter = (actor: Actor, id?: string) => ({
  ...(id ? { _id: id } : {}),
  ...(isAdmin(actor) ? {} : { owner: actor.id })
});
export const updateNote = async (actor: Actor, id: string, input: UpdateNoteInput) => {
  const note = await NoteModel.findOneAndUpdate(accessFilter(actor, id), input, { new: true, runValidators: true });
  if (!note) throw notFound('Note not found'); // also for other users' notes: never reveal existence
  return note;
};
```

**Lists** (`utils/pagination.ts`): Extend `paginationQuerySchema` (`page`, `limit ≤ 100`, `sort` like `-createdAt`). Declare sortable fields with `sort: sortSchema(['createdAt', 'title'])` — anything else → 400, never list private fields. Return `paginate(Model, filter, query)` → `{ items, page, limit, total, totalPages }`. Escape user text before `RegExp`.

**Admin endpoints** (`routes/admin.route.ts`): All under `/api/admin`. **Base default: `authGuard` only** (every signed-in account can use them — students can try admin area). To restrict to admins: change guard to `adminRouter.use(authGuard, requireRole('admin'))` + add `roles={['admin']}` to admin route in `FE/src/App.tsx`. Endpoints: `GET /stats`, `GET /users` (search `q`, filters `role`, `verified`, allowlisted `sort`, pagination), `GET|PATCH|DELETE /users/:id`, `POST /users/bulk-delete` (`{ ids }`, `bulkIdsSchema`). Deleting user also deletes their notes + avatar. Signed-in account can never remove own admin role or delete itself (checked in `admin-user.service.ts`, keep it). Yes/no filters use `optionalBooleanQuerySchema` (missing = no filter).

**Errors** (`utils/app-error.ts` + `errorMiddleware`): Throw `badRequest`, `unauthorized`, `forbidden`, `notFound`, `conflict` or `new AppError(status, message, details?)`. Middleware maps: malformed JSON → 400, JSON >100kB → 413, `ZodError` → 400, Multer file too large → 413, other Multer → 400, invalid ObjectId → 400, Mongoose validation → 400, duplicate key → 409. Else → `500 { message: 'Internal server error' }` (stack logged server-side, in body only in dev). Unknown routes → `404 { message: 'Route not found: ...' }`.

**Models:** `<Name>Document` interface + `Schema`, `{ timestamps: true }`, DB constraints (`required`, `maxlength`, `enum`), indexes for default list query, `toJSON` transform removes `__v` + private fields. User model strips `password`, `otpCode`, `otpExpiresAt`, `resetToken`, `resetTokenExpiresAt` in `toJSON` — returning user **document** is safe. `.lean()`/`aggregate()` skip `toJSON`: with them, `.select()` public fields explicitly.

**Smart EdTech data models:**
- `assignment.model.ts`: `title`, `description`, `instructions`, `createdBy` → User, optional `dueDate`, `maxScore` ≥ 0 default 100, status `draft|published|closed`
- `submission.model.ts`: `assignment` → Assignment, `student` → User, `code`, `language` enum, `submittedAt`, status `submitted|graded`, teacher-confirmed `score` ≥ 0, `feedback`. Not unique per (assignment, student) — history kept. `score` never AI suggestion; `score ≤ maxScore` rule in future grading service.
- `rubric.model.ts`: criteria with weight auto-normalization (Σ=100)
- `testcase.model.ts` / `testresult.model.ts`: test cases for auto-grading, results per submission

**Assignment access** (`/api/assignments`, `assignment.service.ts`): Teachers/admins create/edit/delete — teachers only own (other's → 404), admins any. All signed-in roles may read: students see non-draft (published/closed from any teacher), teachers see own (drafts included), admins everything. Drafts hidden behind 404, never 403.

**Submission API** (`/api/submissions`, `submission.service.ts`): Only students (`role: 'student'`) submit — any number of times, history kept. `GET /api/submissions?assignment=<id>` returns caller's submissions only, populated with assignment public fields. `GET /api/assignments/:id/submission-access` → `{ canSubmit, reason? }`: drafts → 404, closed/past-deadline → `canSubmit: false` with reason. Same rules block `POST /api/submissions` (403).

**External services:**
- Email: `sendEmail(to, subject, html)`. No `SMTP_HOST` → JSON transport, printed to console (dev); prod → `AppError(503)`.
- AI: `generateChatReply(messages)` in `services/ai.service.ts` calls Google Gemini via `@google/genai` (never deprecated `@google/generative-ai`). System prompt + thinking level (default `LOW`) from `config/chatbot.ts`; default model `gemini-3.5-flash-lite`. No `GEMINI_API_KEY` → `AppError(503)`; 429 → 429; bad key/model → 503; other → 502. `POST /api/chat` adds `authGuard` + 10 req/min/user limit.
- Images: `uploadImage(buffer, folder)` / `deleteImage(publicId)`. No Cloudinary vars → upload `AppError(503)`, delete no-op. Store `publicId` to delete later.

### 5.3 HTTP Response Conventions

| Situation | Status | Body |
|-----------|--------|------|
| Read / update | 200 | the resource |
| List | 200 | `{ items, page, limit, total, totalPages }` |
| Create | 201 | created resource (auth register: `{ message }`) |
| Delete | 204 | empty |
| Login OTP step | 202 | `{ message, requiresOtp, email }` |
| Validation error | 400 | `{ message, errors: [{ field, message }] }` |
| Unauthorized / forbidden | 401 / 403 | `{ message }` |
| Not found (incl. other users' resources) | 404 | `{ message }` |
| Conflict | 409 | `{ message }` |
| File too large | 413 | `{ message }` |
| Too many requests | 429 | `{ message }` |
| Service not configured | 503 | `{ message }` |
| Server error | 500 | `{ message }` |

All API routes under `/api`. Health: `GET /health` → `{ ok: true }`.

### 5.4 Security Rules

- Private fields removed by model's `toJSON`; add new private fields to `PRIVATE_USER_FIELDS` or model's transform.
- Passwords: bcrypt (`utils/hash`). OTP/reset codes: single-use. **Do not change OTP functions.**
- Rate limits: 300 req/15 min global, 20 req/15 min on `/api/auth/*` except `/me` (off in tests). Behind proxy set `TRUST_PROXY=1`.
- `npm run seed` refuses `NODE_ENV=production`.
- Ownership checks in services; other users' resources → 404.
- Uploads: memory storage, 5 MB, JPEG/PNG/WebP/GIF only (`imageUpload`).

### 5.5 Testing

- `tests/unit` — pure functions, middlewares. `tests/integration` — real app over HTTP with in-memory MongoDB.
- Mongod binary downloaded once in `tests/setup/download-mongod.ts` (Vitest `globalSetup`); each file starts own mongod.
- Use `api()` from `tests/helpers/api.ts` (binds 127.0.0.1; `request(app)` can hit other servers on macOS). Custom router → `serve(app)`.
- `createUser({ role, loginOtpEnabled, ... })` + `bearerFor(user)` from `tests/helpers/user-factory.ts`. Emails: `email-outbox.ts`; Cloudinary: `cloudinary-recorder.ts`.
- See `tests/integration/notes.test.ts` for CRUD, ownership, pagination, validation cases.

### 5.6 Playbook: Add New Feature Endpoint

1. `npm run gen:module -- <name>` (copies `notes`, registers router), then change fields. Or by hand:
2. **Model** — `models/<name>.model.ts` (constraints, indexes, `toJSON`)
3. **Validator** — create/update/list-query schemas in `validators/<name>.validator.ts`
4. **Service** — queries with `accessFilter`, `paginate`, `throw notFound(...)`
5. **Controller** — thin handlers; 201 on create, 204 on delete
6. **Route** — `authGuard`, `requireRole`, `validate` per endpoint; mount in `app.ts`
7. **Env** — new vars in `config/env.ts` + `.env.example`
8. **Tests** — integration test like `notes.test.ts`
9. **Verify** — `npm test` && `npm run build`

### 5.7 Do / Don't

| ✅ Do | ❌ Don't |
|------|----------|
| Keep controllers thin; queries & access rules in services | Send error responses by hand or wrap handlers in try/catch |
| Validate body, query, params with `validate` | Read `process.env` outside `config/env.ts` |
| Throw `AppError` helpers for expected failures | Return documents with private fields `toJSON` doesn't strip |
| Use `paginate` for every list | Add new top-level folders without clear layer justification |

---

## 6. Frontend Rules

### 6.1 Feature-Module Architecture

Code organized by **feature module** (self-contained), not file type.

```
src/
├── main.tsx                 # QueryClientProvider + BrowserRouter + App + Toaster; applyTheme()
├── App.tsx                  # auth routes + protected shell; feature routes from app/modules.ts
├── app/
│   ├── module.types.ts      # AppModule, ModuleRoute, NavItem
│   └── modules.ts           # registry: list of feature modules
├── modules/
│   ├── auth/                # api/, components/, hooks/, pages/, store/, types/
│   ├── admin/               # admin area: admin.module.ts, api/, hooks/, components/, pages/
│   ├── chat/                # sample AI chat: chat.module.ts (widget), chat.config.ts, hooks/, components/
│   ├── home/                # home.module.ts, pages/HomePage
│   ├── notes/               # REFERENCE MODULE: api/, hooks/, components/, pages/, types/, notes.module.ts
│   └── profile/             # profile.module.ts, api/, components/, pages/
├── shared/
│   ├── api/                 # http.ts (axios), query-client.ts, api-error.ts, types.ts (Paginated<T>)
│   ├── components/          # page-header, empty-state, error-state, loading-state, confirm-dialog, form-field, pagination
│   ├── components/data-table/  # DataTable, SearchInput, FilterSelect, TableToolbar
│   ├── components/layout/   # AppLayout (top nav + module widgets), AdminLayout (sidebar, /admin)
│   ├── components/ui/       # shadcn/ui primitives (button, input, dialog, switch, ...)
│   ├── hooks/               # use-debounce, use-pagination, use-list-params
│   └── lib/utils.ts         # cn(), theme helpers
└── test/                    # setup.ts, render-with-providers.tsx
```

**Module vs Shared:**

| Put in `module/` when... | Put in `shared/` when... |
|--------------------------|--------------------------|
| Logic belongs to one feature | Reused across ≥2 features |
| Page, feature component, feature API/hook | Generic UI (button, empty state, pagination) |
| Feature-specific types | Axios/query client, `cn()`, generic hooks |

**Rule:** Default to feature module. Promote to `shared/` only when second module needs it.

### 6.2 Naming Conventions

- Folders & non-component files: `kebab-case` — `notes.api.ts`, `use-notes.ts`, `note.types.ts`, `form-field.tsx`
- Feature components & pages: `PascalCase.tsx` — `NoteFormDialog.tsx`, `NotesListPage.tsx`
- Exports: named (not default). `App` is the one default export.
- API modules: one object — `export const notesApi = { list, get, create, update, remove }`
- Module descriptor: `export const notesModule: AppModule` in `<feature>.module.ts`

### 6.3 Path Aliases

Use `@/` for all `src`-relative imports. Relative imports fine inside one module (`../hooks/use-notes`).

### 6.4 Core Patterns

**1. HTTP layer** (`shared/api/http.ts`): One shared Axios instance. **Never call `axios` directly** or hardcode base URLs.
- Base URL from `import.meta.env.VITE_API_BASE_URL` (typed in `src/vite-env.d.ts`, fallback `http://localhost:5003/api`)
- Request interceptor adds `Authorization: Bearer <token>` from `tokenStore`
- Response interceptor on `401` clears token + redirects to `/logout`

**2. Feature API modules** (`modules/<f>/api/<f>.api.ts`): Typed functions returning response body:
```ts
export const notesApi = {
  list: (params: NoteListParams = {}) => http.get<Paginated<Note>>('/notes', { params }).then((r) => r.data),
  create: (input: NoteInput) => http.post<Note>('/notes', input).then((r) => r.data),
};
```

**3. Server state** (`modules/<f>/hooks/use-<f>.ts`): All reads/writes through TanStack Query hooks — never `useEffect` + `useState` for fetching.
```ts
export const noteKeys = { all: ['notes'] as const, list: (p: NoteListParams) => [...noteKeys.all, 'list', p] as const };
export const useNotes = (params: NoteListParams) =>
  useQuery({ queryKey: noteKeys.list(params), queryFn: () => notesApi.list(params), placeholderData: keepPreviousData });
export const useCreateNote = () => {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: notesApi.create, onSuccess: () => queryClient.invalidateQueries({ queryKey: noteKeys.all }) });
};
```
`shared/api/query-client.ts` defaults: 4xx never retried, other failures once. **Mutation without `onError` shows backend message as toast automatically.** Add `onError` only for custom handling (e.g. rollback optimistic update, see `SecuritySettings.tsx`).

**4. Current user** (`modules/auth/hooks/use-current-user.ts`):
- `useCurrentUser()` — signed-in user, fetched once, shared (`currentUserKey = ['me']`)
- `useSetCurrentUser()` — store user from mutation; or invalidate `currentUserKey`
- `useLogout()` — clears token + cache, opens `/login`
- 401 from any request → redirect `/logout` (http interceptor). Other failures keep user signed in.

**5. Auth token** (`modules/auth/store/token.store.ts`): JWT in `localStorage` behind `tokenStore` (`get/set/clear`). Never touch `localStorage` for auth directly.

**6. Routing & navigation** (`app/modules.ts`): Feature pages registered, not hand-written in `App.tsx`:
```ts
// modules/notes/notes.module.ts
export const notesModule: AppModule = {
  routes: [{ path: '/notes', Component: NotesListPage }],
  navItems: [{ to: '/notes', label: 'Notes', icon: StickyNote }],
};
// app/modules.ts
export const appModules: AppModule[] = [homeModule, notesModule, profileModule];
```
Every registered route renders inside `ProtectedRoute` + `AppLayout`. Module may also add:
- `adminRoutes` (paths under `/admin`) + `adminNavItems`: rendered inside `AdminLayout` (sidebar). **Base default: every signed-in account can open admin area.** To restrict: wrap `AdminLayout` in `<ProtectedRoute roles={['admin']}>` in `App.tsx` + `requireRole('admin')` in `BE/src/routes/admin.route.ts`.
- `widgets`: components on every `AppLayout` page (floating UI like chat button). Add `roles: ['admin']` to route/nav item to restrict. Public auth pages (`/login`, `/register`, `/forgot-password`) in `App.tsx` under `AuthLayout`. Page number in URL via `usePagination()` (`?page=2`).

**7. Forms** (React Hook Form + Zod + `FormField`):
```tsx
const schema = z.object({ title: z.string().trim().min(1, 'Title is required').max(120) });
const { register, handleSubmit, formState: { errors } } =
  useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({ resolver: zodResolver(schema), defaultValues });

<FormField id="note-title" label="Title" error={errors.title?.message}>
  <Input id="note-title" {...register('title')} />
</FormField>
```
- Mirror backend validation (backend re-validates; FE validation is UX).
- Strip empty optional strings to `undefined` before submit (see `ProfileEditForm.tsx`).
- Disable submit with `mutation.isPending`. Use `useWatch` (not `watch`) for live values.

**8. Page states:** Every data page handles all states with shared components:
```tsx
if (query.isPending) return <LoadingState />;
if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
if (query.data.items.length === 0) return <EmptyState title="No notes yet" action={...} />;
```
Use `PageHeader` for title row, `Pagination` under lists, `ConfirmDialog` before delete, `useDebounce` for search boxes.

**9. Tables & admin pages:** `DataTable` takes column config (`{ id, header, cell, sortKey? }`), rows, `getRowId`. Sorting by backend: pass `sort` + `onSortChange` (headers cycle `field` → `-field`). Pass `selectedIds` + `onSelectedIdsChange` for checkboxes/bulk actions; `isRowSelectable` disables rows. `SearchInput` (debounced) + `FilterSelect` (`''` = all) in `TableToolbar`. `useListParams({ sort })` keeps `q`, filters, `sort`, `page` in URL, resets page when filter changes. `AdminUsersPage` shows all together.

**10. UI, styling, notifications:**
- shadcn/ui primitives in `shared/components/ui/` — reuse; compose classes with `cn()`.
- Tailwind theme tokens (`bg-background`, `text-muted-foreground`, `text-destructive`, ...) — no raw colors, dark mode works.
- `toast.success` / `toast.error` from `sonner`; `<Toaster />` mounted once in `main.tsx`.

### 6.5 Testing

- Tests next to code: `*.test.ts(x)`.
- Mock feature's api module with `vi.mock('../api/notes.api', ...)`, render with `renderWithProviders(<Page />, { route: '/notes', otherRoutes: { '/login': 'login page' } })` from `src/test/render-with-providers.tsx` (fresh QueryClient without retries + MemoryRouter).
- Assert what user sees (`findByText`, `getByRole`), not implementation details. See `NotesListPage.test.tsx`.

### 6.6 Playbook: Add New Feature Module

1. `npm run gen:module -- <name>` (copies `notes`, registers it). Or copy `modules/notes/` by hand.
2. **Types** — `types/<name>.types.ts`
3. **API** — `api/<plural>.api.ts`, returning response bodies
4. **Hooks** — key factory + `useQuery`/`useMutation` with invalidation
5. **Components/Pages** — reuse shared components; all page states handled
6. **Register** — `<plural>.module.ts` + one entry in `app/modules.ts`
7. **Tests** — page test with mocked api
8. **Verify** — `npm run lint`, `npm test`, `npm run build`

### 6.7 Do / Don't

| ✅ Do | ❌ Don't |
|------|----------|
| Organize by feature module; register in `app/modules.ts` | Call `axios` directly, hardcode API URLs, fetch in `useEffect` |
| Fetch & mutate only through TanStack Query hooks + feature `api` object | Add feature routes to `App.tsx` by hand |
| Use `useCurrentUser()` for signed-in user | Read/write auth token outside `tokenStore` |
| Validate forms with Zod + lay out with `FormField` | Hardcode hex colors — use theme tokens |
| Handle loading/error/empty states with shared components | Put feature code in `shared/` |

---

## 7. Admin Area

`/admin` has own sidebar layout (`FE/src/shared/components/layout/AdminLayout.tsx`). Reference page: user management `FE/src/modules/admin/pages/AdminUsersPage.tsx` (search, filters, sortable table, pagination, edit dialog, delete, bulk delete) backed by `BE/src/routes/admin.route.ts`.

**Access (base default): every signed-in account can open admin area** — students can try it. Lock is one line each side: `requireRole('admin')` in `BE/src/routes/admin.route.ts` and `<ProtectedRoute roles={['admin']}>` around `AdminLayout` in `FE/src/App.tsx`. Recommend locking before real users join. Keep server-side checks preventing account from deleting itself or removing own admin role.

**To add admin page for a feature module:**

1. **Backend:** endpoints under `/api/admin/...` in `admin.route.ts`. Lists use `validate({ query })` with `sortSchema`, `optionalBooleanQuerySchema` for yes/no filters, `paginate`. Bulk actions take `bulkIdsSchema` (`{ ids }`).
2. **Frontend:** in module's `<feature>.module.ts` add `adminRoutes: [{ path: '/admin/<plural>', Component }]` and `adminNavItems: [{ to: '/admin/<plural>', label, icon }]`. Build page like `AdminUsersPage`: `TableToolbar` with `SearchInput` + `FilterSelect`, `DataTable` with column config, `Pagination`, `ConfirmDialog`, `useListParams` to keep search, filters, sort, page in URL.

---

## 8. AI Chat Bot (Google Gemini, free tier)

Sample chat bot to customize, not a finished product:

- **UI:** Floating button bottom-right opens chat popup (`FE/src/modules/chat/components/ChatWidget.tsx`), registered as `widget` in `chat.module.ts`. No page of its own. Texts/suggested questions: `chat.config.ts`; conversation state: `hooks/use-chat.ts`.
- **Backend:** `POST /api/chat` with `{ messages: [{ role: 'user' | 'model', text }] }` → `{ reply }`. Stateless: client sends conversation each time. Signed-in users only, 10 messages/min/user.
- **Personality:** `BE/src/config/chatbot.ts` (system prompt, thinking level, history length; Gemini 3.5 ignores temperature). Gemini calls: `BE/src/services/ai.service.ts` with `@google/genai` (never deprecated `@google/generative-ai`).
- **Config:** `GEMINI_API_KEY` (free at https://aistudio.google.com/apikey) and `GEMINI_MODEL` (default `gemini-3.5-flash-lite`, thinking `LOW`) in `BE/.env`. Quota errors → 429. Never put key in frontend code.

---

## 9. Smart EdTech — Project Specifics

This section covers the Smart EdTech project built on this base.

### 9.1 Domain Models (already implemented)

| Model | Description | Key Fields |
|-------|-------------|------------|
| `Course` | Course catalog | `code`, `name`, `description`, `createdBy` |
| `Class` | Class instance | `course`, `teacher`, `students[]`, `semester`, `schedule` |
| `Enrollment` | Student ↔ Class | `student`, `class`, `enrolledAt`, `status` |
| `Assignment` | Programming exercise | `title`, `description`, `instructions`, `createdBy`, `dueDate`, `maxScore`, `status` |
| `Submission` | Student code submission | `assignment`, `student`, `code`, `language`, `submittedAt`, `status`, `score`, `feedback` |
| `Rubric` | Grading criteria | `name`, `criteria[]` (name, description, weight — auto-normalized to Σ=100) |
| `TestCase` | Auto-grading test cases | `assignment`, `input`, `expectedOutput`, `isHidden`, `points` |
| `TestResult` | Test execution result | `submission`, `testCase`, `passed`, `output`, `executionTime` |

### 9.2 Key Business Rules

- **Assignments:** Teachers create/edit own; admins any. Students see published/closed only. Drafts → 404.
- **Submissions:** Students only, unlimited attempts (history kept). `GET /submissions?assignment=` returns own submissions. Submission access checked via `/assignments/:id/submission-access`.
- **Rubrics:** Weight auto-normalizes to 100%. Teachers/admins manage. Default template endpoint available.
- **Test Cases:** Linked to assignments. Hidden cases not shown to students. Results stored per submission.
- **AI Grading Assistant:** Analyzes code, suggests feedback & provisional score based on rubric. Teacher reviews/confirms. Never auto-publish grades without teacher approval.

### 9.3 AI Integration Guidelines (when Jira involves AI)

- Separate AI API calls into dedicated service (`services/ai.service.ts` pattern).
- Read API keys from server env only (`BE/.env`).
- Design for provider swap (DeepSeek, code-specialized models) without rewriting business logic.
- Set timeouts, handle errors, limit input size, handle malformed responses.
- Don't assume API always available or returns correct format.
- If no credentials, build integration structure + document config; don't fake real API calls.

### 9.4 Pedagogical Principles for AI Feedback

AI feedback should help students **understand errors**, not give complete solutions:
- Issue detected
- Code location/segment (when identifiable)
- Root cause explanation
- Step-by-step fix suggestions
- Concepts to review
- Confidence level / limitations

Never auto-provide full solution unless assignment policy allows & Jira explicitly requires.

### 9.5 Score Suggestion Guidelines

- Use teacher-defined rubric/criteria
- Distinguish AI-suggested score vs teacher-final score
- Provide explanation per criterion when feasible
- Don't treat model output as absolute truth
- Teacher must review, edit, confirm
- Don't auto-publish final score unless explicitly designed & allowed

### 9.6 Code Safety

Student code = untrusted input. **Never execute arbitrarily on Node.js server.**
- If task requires running tests/executing code → use proper sandbox (resource limits, timeouts, network isolation).
- Don't use AI prompt as sandbox substitute.
- If task only needs static analysis → don't build execution system.

---

## 10. Jira MCP Integration

Jira MCP is connected. **Proactively use it** to read info instead of asking user.

### 10.1 Before Implementing

- Identify correct Project & Jira Task (Project key: **DSE**)
- Read: Description, Acceptance Criteria, Comments, Assignee, Priority, Status
- Check: Epic, related Tasks, dependencies, Sprint, Backlog
- Cross-reference Jira with repo & previous execution reports
- **cloudId: `https://nvb3117.atlassian.net`** (do NOT call `getAccessibleAtlassianResources`)
- **maxResults: 10** for ALL JQL searches

### 10.2 Read/Write Permissions

| Can do automatically | Must get approval first |
|---------------------|-------------------------|
| Search/read Issues, Epics, Sprints, Backlog, Comments, history, status, Assignee, Priority | Any write/change to Jira: create/edit/delete Issue, Description, AC, Comment, Assignee, Priority, status, links, Sprint, Backlog |
| Synthesize progress, analyze dependencies | |

### 10.3 Jira Action Preview (required before write)

Present:
- Issue: Jira ID + title
- Action: planned operation
- Current State: current value
- Proposed Change: specific change
- Reason / Impact: why & effects

Wait for explicit confirmation. If user declines → don't execute; continue independent safe work. Code implementation approval ≠ Jira write approval.

---

## 11. GitHub MCP & Source Control

GitHub MCP connected. Use MCP when suitable; Git/terminal for local ops.

### 11.1 Before Changes

- Identify repo, remote, branch
- Read README, AGENTS.md, repo guides
- Check latest commit, local/remote status, git status, diff
- Identify user's uncommitted changes
- **Never** auto-switch branch, overwrite, reset, or delete user's changes

### 11.2 Before Proposing Commit

After implementation:
- Run lint, unit/integration tests, build (if supported)
- Verify related functional flows
- Review `git status`, `git diff`, staged diff
- Check file list: only Task changes in commit proposal
- **Exclude:** `.env`, credentials, API keys, secrets, personal data, unnecessary generated files
- Don't hide failing tests or env limitations

### 11.3 Commit & Push (Auto after tests pass)

**No approval gates** — commit & push automatically after `npm test` && `npm run lint` && `npm run build` pass.

Commit message: Conventional Commits (`feat:`, `fix:`, `test:`, `refactor:`, ...).
- Stage only approved files
- Re-check staged diff matches preview
- Create commit with approved message
- Push to approved remote/branch
- Verify commit hash & push result
- Update Markdown report with actual info

### 11.4 High-Risk Actions (still need approval)

- Force-push, delete branch/repo, overwrite history, merge PR, change branch protection, deploy production, delete/overwrite user changes
- These need separate preview & approval; never use `git push --force` to auto-resolve conflicts
- If remote has new commits or push fails → fetch & analyze; don't auto reset/rebase/overwrite; ask permission

---

## 12. Markdown Execution Reports

**Purpose:** Log progress, decisions, test results, context for multi-session continuity.

**Reports are append-only:** Only add new sessions or dated corrections; never delete old entries. If fixing wrong info, keep old content with marker + add correction with date/reason.

**Location:** `reports/agent/` (structure below). Respect existing structure; don't create duplicates.

```
reports/
└── agent/
    ├── README.md          # index & guide
    ├── latest.md          # latest execution summary
    └── jira/
        ├── DSE-XX.md      # long-term log per Jira Task
        └── ...
```

### 12.1 Before Starting/Continuing Task

1. Find & read Task's Jira report
2. Read `latest.md` if relevant
3. Cross-reference with Jira, codebase, git status, git history
4. Identify: done, remaining, results to re-verify

### 12.2 After Each Session

- Update Task report + `latest.md`
- Update README/index if new Task
- Record: test results, files changed, decisions, blockers, pending approvals, next steps
- Record commit hash/URL **only when commit/push actually succeeded**
- If commit/push not approved yet → still update local report, mark status as pending sync

### 12.3 Report Template per Jira Task

```markdown
# [JIRA-ID] — [TASK TITLE]

## 1. General Info
- Jira ID:
- Project / Sprint:
- Date:
- Status: DONE / PARTIAL / BLOCKED
- Repository / Branch:

## 2. Objective & Acceptance Criteria
(Summary from Jira)

## 3. Initial Survey
(Codebase state, related modules, dependencies, existing changes, baseline issues)

## 4. Execution Log
(Changes, technical decisions, results per session)

## 5. Files Changed
| File | Action | Description |
|------|--------|-------------|

## 6. Testing & Verification
| Test | Command / Method | Result | Notes |
|------|------------------|--------|-------|
| Lint | | PASS / FAIL / NOT RUN | |
| Unit test | | PASS / FAIL / NOT RUN | |
| Build | | PASS / FAIL / NOT RUN | |
| Integration | | PASS / FAIL / NOT RUN | |

Only mark PASS when actually run & confirmed.

## 7. Acceptance Criteria
| Criteria | Status | Evidence |
|----------|--------|----------|
| | PASS / PARTIAL / FAIL / NOT VERIFIED | |

## 8. Jira
- Status before/after (if verified):
- Proposed actions:
- Approved & executed:
- Still pending:

## 9. GitHub
- Repository / Branch:
- Commit Status: NOT CREATED / COMMITTED / PUSHED
- Commit Hash / URL:
- Commit Message:
- Push result:

## 10. Blockers & Remaining Work

## 11. Next Steps

## 12. Session History
| Date | Progress | Changes | Status |
|------|----------|---------|--------|
```

Fields not applicable → `N/A`. Don't fill expected results as if done.

---

## 13. Autonomy & Approval Gates

### 13.1 Can Do Automatically

- Read Jira, GitHub, repo, Markdown reports
- Analyze, plan, propose changes
- Create/edit code within Task scope
- Run lint, test, build, check diff
- Update local Markdown reports (preserve history)
- Prepare Jira Action Preview & GitHub Commit Preview

### 13.2 Must Get Approval Before

- Any Jira write/change (Issue, Description, AC, Comment, Assignee, Priority, status, links, Sprint, Backlog)
- **High-risk Git actions:** force-push, delete branch/repo, overwrite history, merge PR, change branch protection, deploy prod, delete/overwrite user changes

### 13.3 When Blocked

- If commit/push not approved: still complete testing, review diff, update local report, hand over results; keep changes local, don't auto-sync remote
- If missing permissions/tools/info/services: do independent safe parts, document limits. Don't claim success for unconfirmed actions.

---

## 14. Definition of Done & Handoff

A Jira Task is **DONE** only when verified:

- Requirements & Acceptance Criteria met
- Code integrated correctly, no placeholders in main flow within scope
- Validation, error handling, security appropriate
- Relevant tests/builds run; verification limits noted
- No regression in related features
- Docs & Markdown reports updated
- Jira/GitHub status accurately described; unapproved actions marked pending

**Handoff summary:**
1. Jira ID + result (DONE / PARTIAL / BLOCKED)
2. Features & files changed
3. Tests run & actual results
4. Markdown report path
5. Jira status & pending actions
6. Commit/push status; hash/URL only when verified
7. Blockers & next steps

**Distinguish:** "code deployed" ≠ "Jira updated" ≠ "committed" ≠ "pushed" — separate states.

---

## 15. Quick Reference

### Key Paths
```
BE/src/app.ts                    # Router mounting
BE/src/config/env.ts             # Env schema
BE/src/utils/app-error.ts        # Error helpers
BE/src/utils/pagination.ts       # Pagination
BE/src/middlewares/validate.middleware.ts
FE/src/app/modules.ts            # Module registry
FE/src/shared/api/http.ts        # Axios instance
FE/src/shared/api/query-client.ts # TanStack Query defaults
FE/src/modules/auth/hooks/use-current-user.ts
FE/src/modules/auth/store/token.store.ts
```

### Common Schemas (validators/common.validator.ts)
- `idParamsSchema` — `{ id: string }` (ObjectId)
- `objectIdSchema` — standalone ObjectId
- `paginationQuerySchema` — `{ page?, limit?, sort? }`
- `sortSchema(allowedFields)` — validates sort param
- `booleanQuerySchema` — required boolean query
- `optionalBooleanQuerySchema` — optional boolean query
- `bulkIdsSchema` — `{ ids: string[] }`

### Shared UI Components (reuse first)
- `PageHeader`, `EmptyState`, `ErrorState`, `LoadingState`, `ConfirmDialog`, `Pagination`, `StatCard`
- `DataTable`, `SearchInput`, `FilterSelect`, `TableToolbar`
- shadcn/ui primitives in `shared/components/ui/`
- Hooks: `useDebounce`, `usePagination`, `useListParams`

### Test Helpers
- BE: `api()` from `tests/helpers/api.ts`, `createUser`/`bearerFor` from `tests/helpers/user-factory.ts`
- FE: `renderWithProviders` from `src/test/render-with-providers.tsx`
- Mocks: `email-outbox.ts`, `cloudinary-recorder.ts`, `gemini-recorder.ts`

---

## 16. For Students (Vibe Coding Guide)

See `docs/vibe-coding-guide.md` for Vietnamese guide on using this base with AI tools (Antigravity, etc.).

Key points:
- Run `npm run setup`, `docker compose up -d`, `npm run seed`, `npm run dev`
- Login: `demo@example.com / demo1234` or `admin@example.com / admin1234`
- OTP printed to BE terminal (no SMTP needed)
- Create features: `npm run gen:module -- <name>`
- Admin area open to all signed-in by default (lock before real users)
- Chat bot: add `GEMINI_API_KEY` to `BE/.env` (free at aistudio.google.com/apikey)
- Always end with `/check` (run tests, lint, build)
- Commit often (`git add -A && git commit -m "..."`)
- Never leak private data in API responses
- When AI writes `App.tsx`, uses `useEffect` for fetch, or manual try/catch → remind: "Follow AGENTS.md"