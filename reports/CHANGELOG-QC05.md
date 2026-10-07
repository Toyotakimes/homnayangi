Báo cáo bản sửa localhost ngày 08/10/2026 trước khi áp dụng quy tắc Deploy 1. Kết quả hợp nhất GitHub và phát hành sau đó được ghi trong releases/deploy-1.md.

- Giữ giao diện cam/nâu và các tab hiện có. Giữ nguyên 1.000 bản ghi, ID, tên, giá, nguyên liệu và cách làm cũ; chỉ bổ sung trường ảnh cho 8 món đã duyệt.
- “Chọn cho tôi” lưu tập kết quả theo bữa/ngân sách, hiển thị món nổi bật cùng danh sách 12 món và “Xem thêm”. “Đổi món” đi tuần tự, chỉ quay lại đầu khi hết tập. Khi sửa điều kiện, kết quả cũ được giữ với nhắc bấm để áp dụng.
- Mâm cơm có món mặn + rau + canh; tính dự kiến theo số người và tổng ngân sách. Giá gốc là khoảng giá, nên kế hoạch phân bổ trong khoảng đó, bắt đầu từ mức thấp rồi tăng về mức giữa nếu còn ngân sách. Tổng là giá dự kiến, không phải cam kết giá thị trường tối đa. Đổi mâm chuyển món vừa dùng về cuối hàng đợi.
- Trang “Món ăn” mặc định truy cập đủ 1.000 món, tách bộ lọc khỏi trang gợi ý. Có tìm kiếm có/không dấu, không phân biệt hoa thường; lọc bữa, cách chế biến, mọi nhóm món hiện có và giá. Hiển thị 12 món rồi tải thêm, không còn giới hạn 120 món.
- Card có ảnh/fallback, tên, nhóm, bữa, giá/người, tổng dự kiến, mục thời gian nấu, nguyên liệu/cách làm và yêu thích. Không bịa thời gian nấu khi database chưa có.
- Ảnh chỉ dùng sau khi duyệt trực quan và metadata khớp tên không dấu. Có nguồn/tác giả/giấy phép, lưu ảnh tại public/images; thay cache version thành 2026-10-08-v2. Thử nguồn dự phòng được duyệt trước khi dùng placeholder. Chưa có ảnh dự phòng thứ hai được xác minh nên các bản ghi hiện tại chỉ có một ảnh chính.
- Đã kiểm tra 6 ca yêu cầu, lưu yêu thích, ảnh lỗi và bố cục tại 1440/768/390/320 px: desktop 3 cột, tablet 2, mobile 1, không tràn ngang. Không có lỗi console trong luồng bình thường. Ca cố tình chặn ảnh xác nhận placeholder không lặp tải vô hạn.

Database: 1.000 món, không trùng tên/ID. 8 món có ảnh xác minh và file tải được; 992 còn placeholder. Thiếu giá: 0. Thiếu nguyên liệu cụ thể: 171. Thiếu trường cách nấu: 0, nhưng 324 hướng dẫn còn chung chung. Thiếu category/bữa: 0. Thiếu thời gian nấu: 1.000.

Phần ảnh chưa hoàn tất: đã rà trường ảnh của cả 1.000 món và tra tên file Commons chính xác, có 42 ứng viên. 15/25 lượt tra metadata bị giới hạn HTTP 429, nhiều lượt tải ảnh cũng bị giới hạn. Chỉ 10 ảnh tải được; loại 2 ảnh không phù hợp và duyệt 8. Không tự dùng ảnh đầu tiên hoặc ảnh món khác để lấp chỗ trống. Xem data-audit.json, dish-audit.csv và photo-review.json để kiểm tra từng bản ghi/nguồn.

File sửa: src/App.jsx, src/styles.css, src/data/dishes.json, index.html. File thêm: src/dishLogic.mjs, src/imageLogic.mjs, public/favicon.svg, 8 ảnh trong public/images, scripts/logic.test.mjs, scripts/browser-check.mjs, scripts/audit-data.mjs, scripts/find-images.mjs, scripts/download-candidates.mjs, scripts/apply-reviewed-images.mjs và các báo cáo trong reports.

Chạy trong D:\homnayangi bằng npm.cmd run dev -- --host 127.0.0.1, mở http://127.0.0.1:5173/. Kiểm tra logic bằng node scripts/logic.test.mjs, audit bằng node scripts/audit-data.mjs, build bằng npm.cmd run build. Kiểm tra Chrome bằng node scripts/browser-check.mjs sau khi cài @playwright/test bằng npm.cmd install --no-save --package-lock=false @playwright/test; script dùng Chrome tại C:/Program Files/Google/Chrome/Application/chrome.exe.
