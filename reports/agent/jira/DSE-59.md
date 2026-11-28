# DSE-59 — Thiết kế lại giao diện FE (theme "Night shift")

## 1. General Info
- Jira ID: DSE-59 (https://nvb3117.atlassian.net/browse/DSE-59)
- Project / Sprint: DSE / N/A
- Date: 2026-11-27 → 2026-11-28
- Status: DONE (code); Jira To Do
- Repository / Branch: base_prj / main

## 2. Objective & Acceptance Criteria
Yêu cầu của người dùng: thiết kế lại UI toàn bộ FE theo phong cách coder/hacker, màu dễ chịu khi làm việc lâu, có animation, tránh "AI design"; áp dụng chuẩn UI/UX, review bằng ảnh chụp desktop + mobile.
- AC1 Giao diện mới áp dụng nhất quán cho mọi trang.
- AC2 Responsive tới mobile, focus bàn phím nhìn thấy được.
- AC3 Tương phản chữ đạt WCAG AA ở cả hai theme.
- AC4 Review mọi trang bằng ảnh chụp desktop + mobile.
- AC5 `npm run check` pass, không làm yếu test.

## 3. Initial Survey
- Theme cũ: teal/emerald HSL, `* { transition }` toàn cục, các lớp `animate-in`/`zoom-in` của shadcn không có tác dụng (thiếu `tailwindcss-animate`).
- Màu thô: `green-*`/`red-*`/`orange-*` ở Home, AssignmentsList, StudentAssignments, RubricBuilder; Toaster hard-code màu tối.
- Hai modal tự chế ở AssignmentsListPage (không Escape, không focus trap, label không gắn input).
- Lỗi có sẵn: Home của admin hiển thị skeleton mãi (`isLoading: true` hard-code) và gợi ý giả "96% verified".

## 4. Execution Log
- Kế hoạch thiết kế (soát cliché AI): nền mực #151B22, panel #1B232C, chữ #D5DCE3, nhấn hổ phách #E8B45A; light: #EEF1F4 / #1C242D / #8A5800. Font Be Vietnam Pro + IBM Plex Mono. Bo góc theo cấp 4/6/8px, panel phẳng không bóng. Điểm nhấn: con trỏ khối hổ phách (nháy 3 lần). Trang login hiện log của một lần chấm bài.
- Token mới `success`/`warning`/`info`/`overlay`, keyframes `enter`/`fade`/`caret`/`scan`, `prefers-reduced-motion` tắt mọi animation và delay; một outline focus toàn cục.
- Viết lại các primitive UI, layout (nav dạng tab, skip link, `FetchIndicator`, `Brand`), các trang chấm bài (CodeViewer, TestResultsTable, AiReviewPanel), chat widget, auth.
- Thay modal tự chế bằng `Dialog`/`ConfirmDialog`; `AssignmentStatusBadge` dùng chung.
- Home admin dùng `useAdminStats(enabled)` → số liệu thật; test mới `HomePage.test.tsx`.
- Review bằng trình duyệt tích hợp (Playwright MCP không mở được Chrome: `spawn UNKNOWN`) ở 1440px và 375px, dark + light, teacher/student/admin; đã sửa các lỗi phát hiện (nút hổ phách quá dày, thanh cuộn thừa ở tab và chat, chat che nội dung, header trang chấm trên mobile, tab đang mở bị khuất trên mobile).

## 5. Files Changed
| File | Action | Description |
|------|--------|-------------|
| `FE/src/index.css`, `FE/index.html`, `FE/public/favicon.svg` | Modified | Token, font, motion, focus, favicon |
| `FE/src/shared/components/ui/*` | Modified | Restyle primitive; Badge có biến thể success/warning |
| `FE/src/shared/components/{brand,fetch-indicator}.tsx` | Added | Logo + vạch báo đang tải |
| `FE/src/shared/components/{page-header,empty-state,error-state,stat-card,pagination}.tsx`, `data-table/*`, `layout/*` | Modified | Khung app và trạng thái trang |
| `FE/src/modules/**` (auth, home, assignment, submission, chat, notes, admin, profile, rubric) | Modified | Polish trang, bỏ màu thô và chuỗi " · " |
| `FE/src/modules/assignment/components/AssignmentStatusBadge.tsx` | Added | Badge trạng thái dùng chung |
| `FE/src/modules/admin/hooks/use-admin.ts` | Modified | `useAdminStats(enabled)` |
| `FE/src/modules/home/pages/HomePage.test.tsx` | Added | Admin thấy số liệu thật; student không gọi stats |
| `FE/src/modules/submission/pages/GradingPage.test.tsx` | Modified | Tách assert `/Lan · submitted/` thành tên + thời gian + ngôn ngữ (cùng thông tin) |
| `FE/docs/architecture.md`, `AGENTS.md` | Modified | §11 Look and feel, quy tắc UI |

## 6. Testing & Verification
| Test | Command / Method | Result | Notes |
|------|------------------|--------|-------|
| Lint | `npm run check` | PASS | FE ESLint |
| Unit test | `npm run check` | PASS | BE 422, FE 142 (+2), sandbox 8 |
| Build | `npm run check` | PASS | BE + FE |
| BE live flow | Script tạm: bật sandbox + BE (`SANDBOX_API_URL` qua biến môi trường, không sửa `.env`), gọi API thật, tự tắt tiến trình sau khi chạy | PASS 31/32 | Mục lệch duy nhất là assert sai của script: `/auth/register/verify-otp` trả `{ message }` theo thiết kế (FE chuyển về /login), không trả token |
| BE e2e | `npm run e2e` trong cùng script | PASS | Chạy sandbox 0/2 → chấm nháp → finalize → lần 2 2/2 (10/10); AI review thật (Gemini) trả high/2 điểm; sinh viên không thấy điểm nháp, stdout của test ẩn bị giấu |
| Integration | Review bằng trình duyệt tích hợp, desktop 1440 + mobile 375, dark + light | PASS | Playwright MCP lỗi launch Chrome |

## 7. Acceptance Criteria
| Criteria | Status | Evidence |
|----------|--------|----------|
| AC1 nhất quán | PASS | Ảnh chụp mọi trang (3 vai trò) |
| AC2 responsive + focus | PASS | Ảnh 375px; thử Tab thấy outline hổ phách |
| AC3 tương phản | PASS | Script tính contrast: chữ ≥ 4.5:1, viền input ≥ 3:1 |
| AC4 review ảnh | PASS (công cụ khác) | Trình duyệt tích hợp thay cho Playwright |
| AC5 check | PASS | `npm run check` 2026-11-28 |

## 8. Jira
- Status before/after: chưa tồn tại → tạo mới, trạng thái To Do (2026-11-28).
- Proposed actions: tạo Task trong DSE (bản xem trước đã gửi người dùng 2026-11-28).
- Approved & executed: người dùng duyệt 2026-11-28 → đã tạo DSE-59.
- Still pending: chuyển trạng thái DSE-59 (cần người dùng duyệt riêng).

## 9. GitHub
- Branch: main
- Commit message (đề xuất): `feat(fe): night-shift UI redesign, accessible dialogs, real admin stats on home`
- Chưa commit/push (task không yêu cầu; chờ người dùng).

## 10. Blockers & Remaining Work
- **Rà soát BE (2026-11-28):** các luồng đều đúng: login cả 3 vai trò, `/me` không lộ trường riêng tư, sai mật khẩu → 401, không token → 401; đăng ký → OTP → login; quên/đặt lại mật khẩu (mật khẩu cũ bị từ chối, token dùng một lần); cập nhật profile; CRUD notes (note của người khác → 404, ObjectId sai → 400); admin stats (teacher → 403), admin xoá user; sinh viên không tạo được assignment; courses; chat (200); toàn bộ luồng chấm bài. CORS chỉ cho phép `CLIENT_URL`. Không phát hiện lỗi code BE.
- **Lỗi "không đăng nhập được" (2026-11-28), không phải lỗi code:**
  1. Bộ `npm run dev` của agent (khởi động 15:01) vẫn sống sau khi tác vụ bị dừng (Windows không tắt tiến trình con), giữ cổng 5003/5173. `npm run dev` của người dùng (15:04) có BE tắt vì cổng bận, FE nhảy sang 5174 → BE chỉ cho phép CORS `CLIENT_URL=http://localhost:5173` → trình duyệt chặn login. Đã xác nhận bằng preflight `Origin: http://localhost:5174` → `Access-Control-Allow-Origin: http://localhost:5173`. Agent không được phép kill tiến trình; người dùng cần tắt.
  2. Có 3 MongoDB cùng cổng 27017: `mongod` Windows (127.0.0.1: 7 assignments, 11 submissions), Docker `mongo:7` và WSL relay (::1: 3 assignments, 5 submissions). `MONGO_URI=localhost` trên Node thường đi IPv6 → DB Docker. Mật khẩu demo đúng ở cả hai, nhưng dữ liệu khác → dễ tưởng mất bài. Cần chọn một DB.
- Bảng rộng vẫn cuộn ngang trên điện thoại; `DropdownMenu` chưa hỗ trợ bàn phím (chưa trang nào dùng); font tải từ Google Fonts.

## 11. Next Steps
- Người dùng tắt các tiến trình dev cũ, chạy lại `npm run dev` (FE phải ở 5173).
- Chọn một MongoDB: hoặc `MONGO_URI=mongodb://127.0.0.1:27017/...` (Windows `mongod`, nhiều dữ liệu hơn) hoặc tắt `mongod` Windows và dùng Docker.
- Chuyển trạng thái DSE-59 khi người dùng duyệt.

## 12. Session History
| Date | Progress | Changes | Status |
|------|----------|---------|--------|
| 2026-11-27 | Kế hoạch thiết kế, token, primitive, layout, các trang, review ảnh | ~60 file FE + docs | In progress |
| 2026-11-28 | Sửa lỗi phát hiện khi review, test Home admin, `npm run check` PASS; chẩn đoán lỗi đăng nhập (cổng/CORS + 2 MongoDB) | Báo cáo này | DONE (code), Jira pending |
| 2026-11-28 | Tạo DSE-59 (đã duyệt), đổi tên báo cáo, rà soát BE, commit + push | Báo cáo | DONE |
