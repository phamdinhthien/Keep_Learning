# System Design Notes

Trang web tĩnh lưu lại các bài học từ 200Lab, xếp theo **Khóa › Môn › Bài giảng** — mỗi bài giảng là một file HTML.

- Xem online: https://phamdinhthien.github.io/SystemDesign_200Lab/ (GitHub Pages, tự deploy khi push lên `main`).
- Xem trên máy: mở `index.html` bằng trình duyệt.

## Cấu trúc

```
index.html                              trang chủ: Khóa → Môn → Bài giảng (có tìm kiếm)
assets/style.css, assets/app.js         giao diện và điều hướng dùng chung
lessons/<khóa>/<môn>/<mã-bài>.html      mỗi bài giảng một file
lessons/lessons.js                      danh sách bài (sinh tự động)
tools/import_lesson.py                  chuyển trang 200Lab đã lưu thành file bài giảng
.github/workflows/pages.yml             deploy GitHub Pages
```

Ví dụ: `lessons/system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-23.html`

- Khóa: System Design
- Môn: Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning
- Bài giảng: Đọc p99, throughput, error rate và saturation trên dashboard

## Thêm bài mới

1. Mở bài trên learn.200lab.io, bấm `Ctrl+S` (lưu dạng "Webpage, Complete").
2. Chạy:

   ```bash
   pip install beautifulsoup4
   python3 tools/import_lesson.py "duong-dan/ten-bai.html" --khoa "System Design" --order 3
   ```

   | Tham số | Ý nghĩa |
   |---|---|
   | `--khoa` | tên Khóa (mặc định `System Design`) |
   | `--mon` | tên Môn (mặc định lấy từ breadcrumb của trang 200Lab) |
   | `--mon-order` | thứ tự của Môn trong Khóa |
   | `--order` | thứ tự của bài trong Môn (bỏ trống thì xếp cuối) |
   | `--id` | mã bài (mặc định lấy từ URL gốc, ví dụ `sd1-23`) |

   Nếu thư mục `..._files` đi kèm có ảnh, ảnh được chép vào `img/<mã-bài>/` cạnh file bài;
   nếu không, ảnh dùng link gốc trên assets.200lab.io.
3. Commit và push lên `main`.

Sửa tay file bài xong thì chạy `python3 tools/import_lesson.py --rebuild` để cập nhật danh sách.
