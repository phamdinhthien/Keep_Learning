// File này được sinh tự động bởi tools/import_lesson.py — đừng sửa tay.
// Mỗi phần tử là một bài học; trang chủ nhóm lại theo khoa (Category) => lop (Khóa).
window.LESSONS = [
  {
    "id": "harness-engineering",
    "path": "ai/tong-hop/harness-engineering.html",
    "khoa": "AI",
    "khoaSlug": "ai",
    "lop": "Tổng hợp",
    "lopSlug": "tong-hop",
    "lopOrder": 1,
    "order": 1,
    "title": "Harness Engineering",
    "description": "Agent = Model + Harness: từ Prompt → Context → Harness Engineering và 9 thành phần bên trong một harness.",
    "readTime": "12 phút đọc"
  },
  {
    "id": "sd1-23",
    "path": "system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-23.html",
    "khoa": "System Design",
    "khoaSlug": "system-design",
    "lop": "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning",
    "lopSlug": "thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning",
    "lopOrder": 1,
    "order": 2,
    "title": "Đọc p99, throughput, error rate và saturation trên dashboard",
    "description": "Mỗi panel gộp nhiều request thành một con số. Vấn đề nằm ở chỗ nó gộp request nào, theo cách nào. Toàn bộ số liệu bên dưới là số minh hoạ của bài, phút 21:00 tại API đặt hàng.",
    "readTime": "10 phút đọc"
  },
  {
    "id": "non-functional-requirement",
    "path": "system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/non-functional-requirement.html",
    "khoa": "System Design",
    "khoaSlug": "system-design",
    "lop": "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning",
    "lopSlug": "thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning",
    "lopOrder": 1,
    "order": 3,
    "title": "Tính năng qua hết test vẫn không dùng được vì thiếu non-functional requirement",
    "description": "Tính năng \"Xuất hóa đơn tháng\" làm đúng cả sáu dòng requirement, code không đổi một ký tự — vậy mà vẫn hỏng đêm cuối tháng. Lý do: bản requirement chỉ nói tính năng làm gì, không nói nó phải làm tốt tới mức nào. Mọi con số trong trang là số minh hoạ của bài.",
    "readTime": "13 phút đọc"
  },
  {
    "id": "sd1-03",
    "path": "system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-03.html",
    "khoa": "System Design",
    "khoaSlug": "system-design",
    "lop": "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning",
    "lopSlug": "thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning",
    "lopOrder": 1,
    "order": 4,
    "title": "Ghi rõ constraint để loại bớt phương án trước khi so sánh",
    "description": "Ngân sách, team, hạ tầng sẵn có — ba giới hạn mà người thiết kế không tự đổi được. Lọc theo chúng trước, rồi mới nhìn tới cột throughput.",
    "readTime": "10 phút đọc"
  },
  {
    "id": "slo-error-budget",
    "path": "system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/slo-error-budget.html",
    "khoa": "System Design",
    "khoaSlug": "system-design",
    "lop": "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning",
    "lopSlug": "thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning",
    "lopOrder": 1,
    "order": 5,
    "title": "Thay yêu cầu “nhanh và luôn chạy” bằng SLO và error budget",
    "description": "Tối qua app checkout crash từ 20:00 tới 20:45. Sáng nay dev nói \"log app không có lỗi 5xx\", product dán ticket \"bấm thanh toán là lỗi\". Cả hai đều đúng — nhưng không ai có số liệu để trả lời. Mọi con số trong trang là số minh hoạ của bài.",
    "readTime": "12 phút đọc"
  },
  {
    "id": "sd1-05",
    "path": "system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-05.html",
    "khoa": "System Design",
    "khoaSlug": "system-design",
    "lop": "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning",
    "lopSlug": "thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning",
    "lopOrder": 1,
    "order": 6,
    "title": "Mô tả workload bằng tải cao điểm theo từng phút, không chỉ bằng số trung bình",
    "description": "Dashboard báo 40 req/s nhưng nginx trả 502: trung bình theo ngày che mất burst 900 req/s kéo dài 3 phút. Đếm peak theo phút bằng awk, viết mục workload sáu dòng và dự báo peak theo nguyên nhân.",
    "readTime": "10 phút đọc"
  },
  {
    "id": "sd1-06",
    "path": "system-design/thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning/sd1-06.html",
    "khoa": "System Design",
    "khoaSlug": "system-design",
    "lop": "Thiết kế hệ thống - ước lượng tải, load balancer, cache, queue, replication và partitioning",
    "lopSlug": "thiet-ke-he-thong-uoc-luong-tai-load-balancer-cache-queue-replication-va-partitioning",
    "lopOrder": 1,
    "order": 7,
    "title": "Ước lượng số máy, dung lượng và băng thông trước khi làm tính năng",
    "description": "Bảng giả định, dung lượng mỗi năm, băng thông, Little's Law và headroom để ước lượng số instance.",
    "readTime": "12 phút đọc"
  }
];
