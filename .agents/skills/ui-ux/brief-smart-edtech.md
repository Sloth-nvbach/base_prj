# Smart EdTech — UI/UX Brief

## Dự án
**Smart EdTech** — AI-powered grading & teaching assistant platform cho các khóa học lập trình.

## Mục tiêu
Thiết kế lại giao diện cho toàn bộ module (nhiều màn hình) theo hướng **flat, clean, consistent**, tận dụng tối đa shadcn/ui + Tailwind v4 hiện có.

---

## 1. Khách hàng & Ngữ cảnh
- **Giảng viên (Teacher)**: Tạo bài tập, quản lý test case, rubric, chấm bài
- **Sinh viên (Student)**: Xem bài tập, nộp bài, xem kết quả, rubric
- **Admin**: Quản lý người dùng, thống kê hệ thống
- **Thiết bị**: Desktop chính (1440px+), responsive xuống tablet (768px) và mobile (375px)

---

## 2. Danh sách màn hình (Screen Inventory)

| # | Màn hình | Route | Loại | Actor | Trạng thái |
|---|----------|-------|------|-------|------------|
| 1 | **Dashboard / Home** | `/` | Dashboard | Tất cả | ✅ Có (HomePage) |
| 2 | **Assignments List** | `/assignments` | Bảng (DataTable) | Teacher, Admin | ✅ Có (AssignmentsListPage) |
| 3 | **Assignment Detail / Edit** | `/assignments/:id/edit` | Form + Tabs | Teacher, Admin | ✅ Có (AssignmentEditTabs) |
| 4 | **Test Cases Management** | (trong Assignment Edit) | Bảng + Dialog | Teacher, Admin | ✅ Có (TestCaseTable) |
| 5 | **Rubric Builder** | (trong Assignment Edit) | Builder + Drag-drop | Teacher, Admin | ✅ Có (RubricBuilder) |
| 6 | **Admin Dashboard** | `/admin` | Dashboard | Admin | ✅ Có (AdminDashboardPage) |
| 7 | **Admin Users Management** | `/admin/users` | Bảng + Dialog | Admin | ✅ Có (AdminUsersPage) |
| 8 | **Profile / Settings** | `/profile` | Form | Tất cả | ✅ Có |
| 9 | **Login** | `/login` | Form xác thực | Guest | ✅ Có |
| 10 | **Register** | `/register` | Form xác thực | Guest | ✅ Có |
| 11 | **Forgot Password** | `/forgot-password` | Form xác thực | Guest | ✅ Có |
| 12 | **Notes** | `/notes` | Card Grid | Tất cả | ✅ Có (NotesListPage) |

---

## 3. Việc chính của từng màn (Job-to-be-done)

### 3.1 Dashboard / Home (`/`)
- **Teacher**: Xem tổng quan bài tập của mình, hành động nhanh (tạo bài tập mới, xem bài cần chấm)
- **Student**: Xem bài tập được giao, deadline sắp tới, bài đã nộp
- **Admin**: Link nhanh đến Admin Dashboard

### 3.2 Assignments List (`/assignments`)
- Tìm kiếm bài tập theo tiêu đề/mô tả
- Lọc theo trạng thái (Draft/Published/Closed)
- Sắp xếp theo các cột (Title, Status, Max Score, Due Date, Created)
- Phân trang
- Tạo bài tập mới (dialog)
- Xóa bài tập (single + bulk)

### 3.3 Assignment Detail/Edit (`/assignments/:id/edit`)
- **Tab Details**: Chỉnh sửa thông tin cơ bản (title, description, instructions, dueDate, maxScore, status)
- **Tab Test Cases**: CRUD test case, import/export JSON, reorder
- **Tab Rubric**: Drag-drop criteria, weight normalization, preview, copy from another assignment

### 3.4 Test Cases Management
- Thêm/sửa/xóa test case (input, expected output, hidden, points)
- Import/Export JSON
- Reorder (drag-drop hoặc nút up/down)
- Validation: input/output required, points 1-100

### 3.5 Rubric Builder
- Thêm/sửa/xóa criteria (name, description, weight, maxScore)
- Drag-drop reorder
- Live weight normalization (progress bar 0-100%)
- Preview mode: hiển thị tính toán điểm theo weight
- Copy từ assignment khác
- Load default template
- Import/Export JSON

### 3.6 Admin Dashboard (`/admin`)
- Stat cards: Users, Admins, Verified, Notes
- Bảng 5 users mới nhất
- Link "View all" đến Admin Users

### 3.7 Admin Users Management (`/admin/users`)
- Tìm kiếm email/name
- Lọc role (Student/Admin), verified
- Sắp xếp các cột
- Edit user (dialog): displayName, role, email verified, login OTP
- Delete single + bulk
- Không cho phép tự xóa mình hoặc bỏ role admin của mình

### 3.8 Profile/Settings (`/profile`)
- Edit display name, avatar (upload Cloudinary)
- Security: toggle login OTP, đổi mật khẩu
- Xem thông tin tài khoản

### 3.9 Auth Pages
- Login: email/password, optional OTP, link register/forgot
- Register: email/password/confirm, OTP verification
- Forgot/Reset password: email, OTP, new password

### 3.10 Notes (`/notes`)
- Card grid layout (responsive: 1/2/3 cột)
- Search title/content, filter tag
- Admin: toggle "All users"
- Create/Edit/Delete note (dialog)
- Tag click to filter

---

## 4. Thiết kế hệ thống (Design System) — D9

### 4.1 Token (CSS Variables) — đã có trong `src/index.css`
```css
/* Colors - Light */
--background: hsl(0 0% 100%);
--foreground: hsl(222 47% 11%);
--card: hsl(0 0% 100%);
--card-foreground: hsl(222 47% 11%);
--primary: hsl(262 83% 58%);          /* Purple */
--primary-foreground: hsl(0 0% 100%);
--muted: hsl(210 40% 96%);
--muted-foreground: hsl(215 16% 47%);
--border: hsl(214 32% 91%);
--input: hsl(214 32% 91%);
--ring: hsl(262 83% 58%);
--destructive: hsl(0 84% 60%);
--accent: hsl(210 40% 96%);
--accent-foreground: hsl(222 47% 11%);

/* Dark */
--background: hsl(222 47% 11%);
--foreground: hsl(210 40% 98%);
--card: hsl(224 40% 14%);
--card-foreground: hsl(210 40% 98%);
--primary: hsl(262 83% 58%);
--muted: hsl(223 25% 20%);
--muted-foreground: hsl(215 20% 75%);
--border: hsl(223 21% 26%);
--input: hsl(223 21% 26%);
--ring: hsl(262 83% 58%);
--destructive: hsl(0 84% 60%);
--accent: hsl(223 25% 20%);
```

### 4.2 Radius
```css
--radius-sm: calc(var(--radius-lg) - 4px);  /* 0.4rem */
--radius-md: calc(var(--radius-lg) - 2px);  /* 0.6rem */
--radius-lg: 0.8rem;                        /* 12.8px */
```

### 4.3 Typography (Inter font)
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 (Page Title) | 1.5rem (24px) | 700 | 1.2 |
| H2 (Section) | 1.125rem (18px) | 600 | 1.3 |
| H3 (Card/Widget) | 1rem (16px) | 600 | 1.4 |
| Body | 0.875rem (14px) | 400 | 1.5 |
| Small/Caption | 0.75rem (12px) | 400 | 1.5 |
| Button/Input | 0.875rem (14px) | 500 | 1 |

### 4.4 Spacing Scale (Tailwind default + custom)
| Token | Value | Usage |
|-------|-------|-------|
| space-1 | 0.25rem (4px) | Icon gaps, tight spacing |
| space-2 | 0.5rem (8px) | Form field gaps, button gaps |
| space-3 | 0.75rem (12px) | Card padding, section gaps |
| space-4 | 1rem (16px) | Page padding, card gaps |
| space-6 | 1.5rem (24px) | Section gaps, page sections |
| space-8 | 2rem (32px) | Major section gaps |

### 4.5 Shadows (Flat style - minimal)
| Elevation | Tailwind Class | Usage |
|-----------|----------------|-------|
| None | (none) | Default cards, buttons |
| Card | `shadow-sm` | Cards in dashboard, tables |
| Floating | `shadow-md` | Dialogs, dropdowns, popovers |
| Modal | `shadow-lg` | Full-screen modals |

### 4.6 Component Variants (theo shadcn/ui)
| Component | Variants | Sizes |
|-----------|----------|-------|
| Button | default, outline, ghost, destructive | default, sm, lg |
| Input | default | default, sm, lg |
| Badge | default, secondary, destructive, outline | default |
| Card | default | default |
| Avatar | default | default, sm, lg, xl |

---

## 5. Phong cách (Style Direction)

**Flat** (mặc định, khớp với audit hiện tại):
- Nền trắng/xám nhạt, card trắng, viền 1px `--border`
- Bo góc `--radius-lg` (12.8px) cho card, `--radius-md` cho button/input
- **Không bóng** cho card mặc định, chỉ bóng cho floating elements (dialog, dropdown)
- Thứ bậc bằng cỡ chữ, độ đậm, màu `--muted-foreground` vs `--foreground`
- Dark mode: nền `--background` (dark slate), card `--card`, viền `--border`

---

## 6. Bố cục mặc định (Layout Patterns)

### 6.1 App Layout (`AppLayout.tsx`) - Đã có
- Header sticky: Logo + Nav links + Theme toggle + Avatar + Logout
- Main: `max-w-6xl mx-auto px-4 py-8`
- Widgets: Floating components (chat button)

### 6.2 Admin Layout (`AdminLayout.tsx`) - Đã có
- Sidebar (lg: fixed w-60, mobile: drawer)
- Top bar: Menu button (mobile) + Theme toggle + Avatar + Logout
- Main: `max-w-6xl mx-auto w-full flex-1 px-4 py-8`

### 6.3 Page Structure (mọi trang)
```tsx
<div className="space-y-6">
  <PageHeader title="..." description="..." actions={<Button>} />
  <Toolbar / Filters / Search />
  <DataTable / Card Grid / Form />
  <Pagination />
</div>
```

### 6.4 Responsive Breakpoints
| Breakpoint | Width | Behavior |
|------------|-------|----------|
| Mobile | < 640px | 1 cột, stack vertical, drawer sidebar |
| Tablet | 640px - 1024px | 2 cột grid, sidebar collapsible |
| Desktop | ≥ 1024px | 3-4 cột grid, full sidebar |

---

## 7. Wireframes (U3-U4) - 2-3 phương án cho từng màn hình chính

### 7.1 Dashboard / Home

#### Phương án A: Role-based Dashboard (Khuyên dùng)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: Logo | Nav | Theme | Avatar ▼ | Logout              │
├─────────────────────────────────────────────────────────────┤
│ PageHeader: "Dashboard" | "Tổng quan hệ thống" | [Tạo BT]   │
├─────────────────────────────────────────────────────────────┤
│ Stat Cards Grid (4 cột desktop, 2 tablet, 1 mobile)         │
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐             │
│ │Users    │ │Assigns  │ │Submits  │ │Pending  │             │
│ │  127    │ │   23    │ │   45    │ │   8     │             │
│ │ +5 tuần │ │         │ │         │ │ cần chấm│             │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘             │
├─────────────────────────────────────────────────────────────┤
│ Section: "Bài tập của bạn" (Teacher) / "Bài tập được giao"   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ DataTable: Title | Status | Due Date | Max Score | Act  │ │
│ │ Loop exercises     | Published | 20/12    | 100      | ...│ │
│ │ Array problems     | Draft     | —        | 100      | ...│ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

#### Phương án B: Activity Feed Focus
- Stat cards nhỏ hơn (2 cột)
- Lịch sử hoạt động gần đây (Timeline component)
- Quick actions nổi bật

---

### 7.2 Assignments List

#### Phương án A: DataTable Full (Khuyên dùng - giống AdminUsersPage)
```
┌─────────────────────────────────────────────────────────────┐
│ Header + Actions: [Tạo bài tập]                             │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: [Search ▼] [Status Filter ▼] [Bulk Delete]         │
├─────────────────────────────────────────────────────────────┤
│ DataTable:                                                  │
│ ☐ | Title              | Status    | Max | Due Date |Created│
│ ──┼────────────────────┼───────────┼─────┼──────────┼───────│
│ ☐ | Loop exercises     | Published │ 100 │ 20/12/24 │15/11  │
│ ☐ | Array problems     | Draft     │ 100 │ —        │10/11  │
│ ☐ | String manipulation│ Closed    │ 100 │ 01/12/24 │05/11  │
├─────────────────────────────────────────────────────────────┤
│ Pagination: ← 1 2 3 ... 12 →    "45 assignments"           │
└─────────────────────────────────────────────────────────────┘
```

#### Phương án B: Card Grid (cho ít cột, nhiều nội dung visual)
- Card per assignment với thumbnail, tag status, quick actions

---

### 7.3 Assignment Detail/Edit (Tabs)

#### Phương án A: Horizontal Tabs (Khuyên dùng)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Assignment: Loop Exercises" | [Publish] [Delete]  │
├─────────────────────────────────────────────────────────────┤
│ Tabs: [Details] [Test Cases] [Rubric]                       │
├─────────────────────────────────────────────────────────────┤
│ Tab Details:                                                │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Form fields: Title*, Description, Instructions,         │ │
│ │ Due Date, Max Score, Status (Draft/Published/Closed)    │ │
│ │ [Cancel] [Save Changes]                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Tab Test Cases: (TestCaseTable component)                   │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Toolbar: [Export JSON] [Import JSON] [Add Test Case]    │ │
│ │ DataTable: # | Input | Expected | Hidden | Points | Act│ │
│ │ 1  | "1\n2\n"       | "3\n"     | ☐      | 10      | ⋮  │ │
│ │ 2  | "5\n10\n"      | "15\n"    | ☑      | 20      | ⋮  │ │
│ │ [Add/Edit Dialog] [Import Dialog] [Confirm Delete]      │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│ Tab Rubric: (RubricBuilder component)                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Weight Progress: ████████████░░░░░░░░  85% / 100%       │ │
│ │ Drag-drop list:                                          │ │
│ │ ┌─────────────────────────────────────────────────────┐ │ │
│ │ ⋮ Correctness      [Name*] [Desc] [Weight: 50] [Max:100]│ │
│ │ ⋮ Code Quality     [Name*] [Desc] [Weight: 25] [Max:100]│ │
│ │ ⋮ Efficiency       [Name*] [Desc] [Weight: 15] [Max:100]│ │
│ │ ⋮ Documentation    [Name*] [Desc] [Weight: 10] [Max:100]│ │
│ │ └─────────────────────────────────────────────────────┘ │ │
│ │ [Add Criterion] [Load Default] [Import] [Export] [Copy] │ │
│ │ Preview Table: Criterion | Weight | Max | Weighted Max   │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.4 Admin Dashboard

#### Phương án A: Stat Cards + Recent Table (Khuyên dùng - giống hiện tại)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Dashboard" | "Overview of the app."               │
├─────────────────────────────────────────────────────────────┤
│ Stat Grid (4 cards): Users | Admins | Verified | Notes     │
├─────────────────────────────────────────────────────────────┤
│ Section: "Newest users" + [View all] → /admin/users        │
│ DataTable (5 rows): Name | Email | Role | Verified | Date  │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.5 Admin Users Management

#### Phương án A: DataTable Full (Khuyên dùng - giống hiện tại)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Users" | "Search, edit and remove accounts."      │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: [Search] [Role Filter] [Verified Filter] [Bulk Del]│
├─────────────────────────────────────────────────────────────┤
│ DataTable (checkbox selection):                             │
│ ☐ | Name | Email | Role | Verified | Created | Actions    │
│ ──┼──────┼───────┼──────┼──────────┼─────────┼────────────│
│ ☐ | John | j@... │ Admin │ ✓       │ 15/11   │ ✏️ 🗑️     │
│ ☐ | Jane | j@... │ Student│ ✗      │ 10/11   │ ✏️ 🗑️     │
├─────────────────────────────────────────────────────────────┤
│ Pagination + "45 users"                                    │
│ Edit Dialog (click ✏️): DisplayName, Role, Verified, OTP   │
│ Confirm Delete (click 🗑️)                                   │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.6 Profile/Settings

#### Phương án A: Two-column Form
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Profile" | "Manage your account."                 │
├─────────────────────────────────────────────────────────────┤
│ ┌──────────────────┐  ┌──────────────────────────────────┐ │
│ │ Avatar Upload    │  │ Form:                             │ │
│ │ [Preview 128px]  │  │ Display Name* [____________]     │ │
│ │ [Upload Button]  │  │ Email (disabled) [user@email.com]│ │
│ │                  │  │ Role (disabled) [Student]        │ │
│ │                  │  │ [Save Changes]                   │ │
│ └──────────────────┘  └──────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│ Section: "Security"                                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Login OTP: [Toggle Switch] "Yêu cầu OTP khi đăng nhập"  │ │
│ │ [Change Password] button → Dialog                       │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.7 Auth Pages (Login/Register/Forgot)

#### Phương án A: Centered Card (Khuyên dùng)
```
┌─────────────────────────────────────────────────────────────┐
│                    (Centered vertically)                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Logo + "MERN Auth"                                      │ │
│ │                                                         │ │
│ │ Title: "Đăng nhập" / "Đăng ký" / "Quên mật khẩu"       │ │
│ │                                                         │ │
│ │ Form fields:                                            │ │
│ │ Email* [________________________]                      │ │
│ │ Password* [________________________]                   │ │
│ │ (Register: Confirm Password)                           │ │
│ │                                                         │ │
│ │ [Submit Button - full width]                           │ │
│ │                                                         │ │
│ │ Divider: "hoặc"                                        │ │
│ │ [Google Login Button - outline]                        │ │
│ │                                                         │ │
│ │ Link: "Chưa có tài khoản? Đăng ký" / "Quên mật khẩu?"  │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.8 Notes List

#### Phương án A: Card Grid (Khuyên dùng - giống hiện tại)
```
┌─────────────────────────────────────────────────────────────┐
│ Header: "Notes" | [New Note]                                │
├─────────────────────────────────────────────────────────────┤
│ Toolbar: [Search] [Tag Filter] [Admin: All users toggle]   │
├─────────────────────────────────────────────────────────────┤
│ Grid (sm:2, lg:3):                                          │
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐             │
│ │ Title       │ │ Title       │ │ Title       │             │
│ │ Content...  │ │ Content...  │ │ Content...  │             │
│ │ #tag1 #tag2 │ │ #tag3       │ │ #tag1       │             │
│ │ [Edit][Del] │ │ [Edit][Del] │ │ [Edit][Del] │             │
│ └─────────────┘ └─────────────┘ └─────────────┘             │
├─────────────────────────────────────────────────────────────┤
│ Pagination                                                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Cổng duyệt (Approval Gates)

### Cổng 1: Duyệt Brief (này)
- [ ] Danh sách màn hình đúng?
- [ ] Việc chính (JTBD) đầy đủ?
- [ ] Design system token/spacing/typography chấp nhận được?
- [ ] Phong cách Flat được chấp nhận?

### Cổng 2: Chọn Wireframe (sau khi trình bày 2-3 phương án)
- Mỗi màn hình chính chọn 1 phương án (A/B/C)
- Ghi nhận lý do chọn

### Cổng 3: Design System Page (nếu chọn lối "Dựng design system trước")
- Trang xem token, component variants, spacing

---

## 9. Lưu ý triển khai

1. **Tái sử dụng component có sẵn**: PageHeader, DataTable, StatCard, Card, Button, Input, Dialog, Badge, Avatar, Pagination, ConfirmDialog, EmptyState, LoadingState, ErrorState
2. **Form**: React Hook Form + Zod + FormField pattern
3. **State**: TanStack Query hooks (useQuery, useMutation)
4. **Routing**: Đăng ký qua `app/modules.ts`, không sửa `App.tsx`
4. **Dark mode**: Đã có CSS variables, chỉ cần đảm bảo component dùng token
5. **Responsive**: Mobile-first, breakpoint `sm:` (640px), `lg:` (1024px)
6. **Accessibility**: Label cho input, aria-label cho icon button, focus-visible
7. **Scrollbar**: Custom scrollbar trong `index.css` (có sẵn)

---

## 10. Next Steps
1. **Duyệt brief này** → Tiến hành vẽ wireframe chi tiết (U3-U4) cho từng màn
2. **Chọn wireframe** → Bắt đầu dựng code theo thứ tự: Layout → Components → Pages
3. **Test & Probe**: Mỗi màn hình probe trên 375px, 768px, 1440px
4. **Checklist**: Chạy `references/checklist.md` trước khi giao