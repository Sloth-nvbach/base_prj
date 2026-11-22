# Smart EdTech — Hướng dẫn cài đặt và sử dụng

Smart EdTech là nền tảng hỗ trợ chấm bài lập trình: sinh viên nộp code, hệ thống chạy code trong sandbox với bộ test case, AI gợi ý nhận xét và điểm theo rubric, còn giảng viên là người duyệt và chốt điểm cuối cùng.

## 1. Yêu cầu

- Node.js 22 trở lên
- Docker Desktop (dùng cho MongoDB, Redis và sandbox chạy code)
- Không bắt buộc: khóa Gemini miễn phí lấy tại https://aistudio.google.com/apikey (dùng cho AI review và chatbot)

## 2. Cài đặt lần đầu

```bash
npm run setup          # cài thư viện, tạo BE/.env và FE/.env
docker compose up -d   # MongoDB :27017 + Redis :6379
npm run sandbox:pull   # tải image node:22-alpine và python:3.12-alpine (một lần)
npm run seed           # tạo tài khoản demo
```

Thêm vào `BE/.env`:

```bash
SANDBOX_API_URL=http://localhost:5010   # bật chức năng chạy test
GEMINI_API_KEY=...                       # bật AI review (không bắt buộc)
```

## 3. Chạy hệ thống

Mở hai terminal:

```bash
npm run sandbox   # sandbox chạy code, cổng 5010 (cần Docker đang chạy)
```

```bash
npm run dev       # backend http://localhost:5003 + frontend http://localhost:5173
```

Kiểm tra toàn bộ luồng và tạo sẵn dữ liệu demo (một bài tập, hai lần nộp, một bài đã chấm):

```bash
npm run e2e
```

## 4. Tài khoản demo

| Vai trò | Email | Mật khẩu |
|---------|-------|----------|
| Giảng viên | `teacher@example.com` | `teacher1234` |
| Sinh viên | `student01@example.com` … `student12@example.com` | `student1234` |
| Quản trị | `admin@example.com` | `admin1234` |

Mã OTP (nếu có) được in ra ở terminal của backend.

## 5. Luồng dành cho giảng viên

1. **Assignments → Create Assignment.** Bấm vào tên bài để mở trang chi tiết.
2. **Tab Details.** Nhập đề bài (instructions), hạn nộp, điểm tối đa, rồi chuyển trạng thái sang `published` để sinh viên nhìn thấy.
3. **Tab Test Cases.** Thêm input và expected output. Đánh dấu *Hidden* cho test ẩn: test ẩn vẫn được chấm, nhưng sinh viên không thấy input và output của nó.
4. **Tab Rubric.** Thêm các tiêu chí (tên, điểm tối đa, trọng số). Tổng trọng số được chuẩn hóa về 100%.
5. **Grading.** Đây là hàng chờ các bài nộp, lọc được theo bài tập và trạng thái. Bấm **Grade** để mở màn hình chấm:
   - Bên trái: đề bài và code có đánh số dòng (các dòng AI chỉ ra lỗi sẽ được tô màu).
   - Bên phải: kết quả từng test case (bấm vào để xem input, expected, actual, stderr), **AI review** và form chấm điểm.
   - **Run AI review**: AI chỉ ra lỗi, dòng code liên quan, nguyên nhân, các bước sửa, khái niệm cần ôn, và gợi ý điểm cho từng tiêu chí. **Use AI suggestion as draft** chỉ điền sẵn vào form; điểm chưa được lưu cho tới khi giảng viên bấm lưu.
   - Nhập điểm từng tiêu chí (tổng điểm được tính ngay khi nhập) và nhận xét, rồi bấm **Save draft**. Sinh viên chưa thấy bản nháp.
   - **Finalize grade**: chốt điểm, gửi email báo cho sinh viên. Sau khi chốt, chỉ quản trị mới sửa được điểm. Mọi lần lưu đều được ghi vào lịch sử.

Công thức điểm: `round(Σ(điểm tiêu chí / điểm tối đa tiêu chí × trọng số) / Σ trọng số × điểm tối đa của bài)`.

## 6. Luồng dành cho sinh viên

1. **My assignments**: danh sách bài tập kèm hạn nộp (đỏ nếu còn dưới 24 giờ, cam nếu còn dưới 72 giờ), trạng thái, số lần nộp và điểm cao nhất.
2. Mở bài, chọn ngôn ngữ, dán code rồi bấm **Submit and run tests**. Code được chạy tự động (JavaScript, TypeScript, Python) và trang kết quả tự cập nhật.
3. Trang bài nộp có các tab **Code** (tải code về), **Test results** (test ẩn chỉ hiện đạt hoặc không đạt), **Rubric** và **Feedback**. Điểm, rubric và nhận xét chỉ hiện sau khi giảng viên chốt.
4. Sinh viên được nộp nhiều lần (khi bài còn mở và chưa quá hạn), toàn bộ lịch sử được giữ lại.

## 7. An toàn khi chạy code

Code của sinh viên không bao giờ chạy trên server API. Mỗi test case chạy trong một container Docker riêng với các giới hạn: không có mạng, 256 MB RAM, 0.5 CPU, tối đa 10 giây, user không phải root, ổ gốc chỉ đọc, `/tmp` tối đa 10 MB, tối đa 64 tiến trình.

## 8. Xử lý sự cố

| Hiện tượng | Cách xử lý |
|------------|-----------|
| Chạy test báo 503 "Sandbox runner not configured" | Đặt `SANDBOX_API_URL` trong `BE/.env`, chạy `npm run sandbox`, rồi khởi động lại backend |
| Bài nộp đứng mãi ở "Running…" | Kiểm tra Redis (`docker compose up -d`) và log backend có dòng "Submission run worker started" không |
| Sandbox báo 503 "Docker could not run the code" | Bật Docker Desktop và chạy `npm run sandbox:pull` |
| AI review báo 429 | Hết lượt miễn phí của Gemini hoặc bấm quá 5 lần/phút; đợi một phút rồi thử lại |
| AI review báo 503 | Kiểm tra `GEMINI_API_KEY` và `GEMINI_MODEL` trong `BE/.env` |
| Tài khoản demo bị 403 trên các trang sinh viên | Chạy lại `npm run seed`: lệnh này sửa role cũ (`user`) của tài khoản demo |
