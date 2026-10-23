# System Design Notes

Trang web tĩnh lưu lại các bài học từ 200Lab, xếp theo **Khóa › Lớp › Bài giảng** — mỗi bài giảng là một file HTML.

- Xem online: https://phamdinhthien.github.io/SystemDesign_200Lab/ (GitHub Pages, tự deploy khi push lên `main`).
- Xem trên máy: mở `index.html` bằng trình duyệt.

## Cấu trúc

```
index.html                              trang chủ: Khóa → Lớp → Bài giảng (có tìm kiếm)
assets/style.css, assets/app.js         giao diện (bộ màu CARBON) và điều hướng dùng chung
assets/shell.css                        thanh điều hướng chèn vào bài giảng dạng trang HTML tự chứa
lessons/<khóa>/<lớp>/<mã-bài>.html      mỗi bài giảng một file
lessons/lessons.js                      danh sách bài (sinh tự động)
tools/import_lesson.py                  thêm bài giảng vào site
.github/workflows/pages.yml             deploy GitHub Pages
```

Ví dụ: `lessons/system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-23.html`

- Khóa: System Design
- Lớp: Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning
- Bài giảng: Đọc p99, throughput, error rate và saturation trên dashboard

## Thêm bài mới

```bash
pip install beautifulsoup4
python3 tools/import_lesson.py bai.html \
  --lop "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning" \
  --id sd1-24 --order 3 --title "Tên bài giảng"
```

Script nhận hai loại file:

- **Trang HTML tự chứa** (infographic, ghi chú…): giữ nguyên trang, chỉ chèn thanh điều hướng
  (Khóa › Lớp, bài trước/sau) vào giữa các dấu `<!-- sdn:... -->`. Import lại nhiều lần không bị lặp.
- **Trang bài học 200Lab đã lưu** (`Ctrl+S`, dạng "Webpage, Complete"): trích nội dung và dựng lại
  theo giao diện của site; Lớp và mã bài tự lấy từ trang.

| Tham số | Ý nghĩa |
|---|---|
| `--khoa` | tên Khóa (mặc định `System Design`) |
| `--lop` | tên Lớp |
| `--lop-order` | thứ tự của Lớp trong Khóa |
| `--id` | mã bài, cũng là tên file |
| `--order` | thứ tự của bài trong Lớp (bỏ trống thì xếp cuối) |
| `--title`, `--description`, `--read-time` | tên, mô tả, thời gian đọc hiển thị trong danh sách (mặc định đoán từ trang) |

Sau đó commit và push lên `main`; GitHub Pages tự cập nhật.
Sửa tay file bài xong thì chạy `python3 tools/import_lesson.py --rebuild` để cập nhật danh sách.
