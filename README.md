# System Design Notes

Trang web tĩnh lưu lại các bài học System Design của 200Lab — **mỗi bài là một file HTML** trong `lessons/`.

- Mở `index.html` bằng trình duyệt để xem danh sách bài (có tìm kiếm, gõ không dấu cũng được).
- Có thể bật GitHub Pages (Settings → Pages → branch, thư mục `/`) để xem online.

## Cấu trúc

```
index.html              trang danh sách bài
assets/style.css        giao diện chung (sáng/tối)
assets/app.js           danh sách, tìm kiếm, nút bài trước/sau
lessons/<mã-bài>.html   mỗi bài một file
lessons/lessons.js      danh sách bài (sinh tự động)
tools/import_lesson.py  script chuyển trang 200Lab đã lưu thành file bài học
```

## Thêm bài mới

1. Mở bài trên learn.200lab.io, bấm `Ctrl+S` (Lưu trang web, dạng "Webpage, Complete").
2. Chạy:

   ```bash
   pip install beautifulsoup4
   python3 tools/import_lesson.py "duong-dan/ten-bai.html" --order 3
   ```

   Script lấy tiêu đề, mô tả, nội dung, bảng, code, sơ đồ; tạo `lessons/<mã-bài>.html`
   (mã bài lấy từ URL gốc, ví dụ `sd1-23`) và cập nhật `lessons/lessons.js`.
   `--order` là vị trí của bài trong danh sách; bỏ trống thì bài được xếp cuối.
   Nếu thư mục `..._files` đi kèm có ảnh, ảnh được chép vào `lessons/img/<mã-bài>/`;
   nếu không, ảnh dùng link gốc trên assets.200lab.io.
3. Commit và push.

Sửa tay file bài học xong thì chạy `python3 tools/import_lesson.py --rebuild` để cập nhật danh sách.
