# System Design Notes

Trang web tĩnh lưu lại các bài học từ 200Lab, xếp theo **Category › Khóa › Bài học** — mỗi bài học là một file HTML.

- Xem online: https://phamdinhthien.github.io/Keep_Learning/ (GitHub Pages, tự deploy khi push lên `main`).
- Xem trên máy: mở `index.html` bằng trình duyệt.

## Cấu trúc

```
index.html                              trang chủ: Category → Khóa → Bài học (có tìm kiếm)
assets/style.css, assets/app.js         giao diện (bộ màu CARBON) và điều hướng dùng chung
assets/shell.css                        thanh điều hướng chèn vào bài học dạng trang HTML tự chứa
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
