# System Design Notes

Trang web tĩnh lưu lại các bài học từ 200Lab, xếp theo **Category › Khóa › Bài học** — mỗi bài học là một file HTML.

- Xem online: https://phamdinhthien.github.io/Keep_Learning/ (GitHub Pages, tự deploy khi push lên `main`).
- Xem trên máy: mở `index.html` bằng trình duyệt.

## Cấu trúc

```
index.html                              trang chủ: Category → Khóa → Bài học (có tìm kiếm)
assets/style.css, assets/app.js         giao diện (bộ màu CARBON) và điều hướng dùng chung
assets/shell.css                        thanh điều hướng chèn vào bài học dạng trang HTML tự chứa
assets/sync.js                          đăng nhập Google, đồng bộ tiến độ học qua Firebase
assets/ask.js                           nút "Hỏi AI" trên mọi trang (Gemini qua Firebase AI Logic): bài đang đọc, hoặc cả thư viện
firebase/firestore.rules                quyền truy cập dữ liệu tiến độ trên Firestore
lessons/<category>/<khóa>/<mã-bài>.html      mỗi bài học một file
lessons/lessons.js                      danh sách bài (sinh tự động)
tools/import_lesson.py                  thêm bài học vào site
.github/workflows/pages.yml             deploy GitHub Pages
```

Ví dụ: `lessons/system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-23.html`

- Category: System Design
- Khóa: Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning
- Bài học: Đọc p99, throughput, error rate và saturation trên dashboard

## Thêm bài mới

```bash
pip install beautifulsoup4
python3 tools/import_lesson.py bai.html \
  --lop "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning" \
  --id sd1-24 --order 3 --title "Tên bài học"
```

Script nhận hai loại file:

- **Trang HTML tự chứa** (infographic, ghi chú…): giữ nguyên trang, chỉ chèn thanh điều hướng
  (Category › Khóa, bài trước/sau) vào giữa các dấu `<!-- sdn:... -->`. Import lại nhiều lần không bị lặp.
- **Trang bài học 200Lab đã lưu** (`Ctrl+S`, dạng "Webpage, Complete"): trích nội dung và dựng lại
  theo giao diện của site; Khóa và mã bài tự lấy từ trang.

| Tham số | Ý nghĩa |
|---|---|
| `--khoa` | tên Category (mặc định `System Design`) |
| `--lop` | tên Khóa |
| `--lop-order` | thứ tự của Khóa trong Category |
| `--id` | mã bài, cũng là tên file |
| `--order` | thứ tự của bài trong Khóa (bỏ trống thì xếp cuối) |
| `--title`, `--description`, `--read-time` | tên, mô tả, thời gian đọc hiển thị trong danh sách (mặc định đoán từ trang) |

Sau đó commit và push lên `main`; GitHub Pages tự cập nhật.
Sửa tay file bài xong thì chạy `python3 tools/import_lesson.py --rebuild` để cập nhật danh sách.

## Đăng nhập Google (đồng bộ tiến độ học)

Bài đã xem và bài xem gần nhất mặc định chỉ lưu trong trình duyệt. Khi bật Firebase, nút **Đăng nhập** hiện
trên thanh trên cùng; đăng nhập Google xong, tiến độ được gộp và lưu theo tài khoản, mở máy nào cũng thấy.
Chưa cấu hình thì site chạy như cũ, không hiện nút.

1. Vào https://console.firebase.google.com, tạo project (gói Spark miễn phí là đủ).
2. **Build › Authentication › Get started**, tab **Sign-in method**, bật **Google**.
3. **Authentication › Settings › Authorized domains**, thêm `phamdinhthien.github.io`.
4. **Build › Firestore Database › Create database** (production mode), tab **Rules**, dán nội dung
   `firebase/firestore.rules` rồi **Publish**.
5. **Project settings › Your apps › Web (`</>`)**, đăng ký app, chép object `firebaseConfig`
   vào `FIREBASE_CONFIG` ở đầu `assets/sync.js`, rồi push.

Config web của Firebase là thông tin công khai, commit vào repo được; dữ liệu được bảo vệ bằng Firestore rules
(mỗi tài khoản chỉ đọc/ghi được `users/{uid}` của chính mình). Dữ liệu lưu: đường dẫn bài đã xem kèm thời điểm xem.

## Hỏi AI (Gemini)

Mọi trang có nút **Hỏi AI** (người đã đăng nhập). Trang bài học: AI nhận nội dung bài đang đọc làm ngữ cảnh.
Trang chủ và trang danh mục: AI nhận danh sách mọi bài, mỗi câu hỏi kèm nội dung 3 bài liên quan nhất, trả lời kèm link bài.
Dùng Firebase AI Logic với Gemini Developer API (gói miễn phí, không cần server).

- Bật: Firebase console › **AI Logic** › **Get started** › chọn **Gemini Developer API**.
- Model thử lần lượt theo `MODELS` ở đầu `assets/ask.js`; model nào bị ngừng thì tự chuyển model sau.
- `DAILY_LIMIT`: số câu mỗi người mỗi ngày (đếm trong trình duyệt, chỉ là giới hạn mềm).
- Nên bật thêm **App Check** (reCAPTCHA) cho AI Logic để người ngoài không dùng config công khai gọi Gemini
  bằng hạn mức của project.
