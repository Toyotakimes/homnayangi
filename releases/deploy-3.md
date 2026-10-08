# Deploy 3 — Tìm kiếm danh sách món và ảnh đã kiểm tra

Hôm nay → Món đơn và Món ăn hiển thị danh sách thẻ 20 món mỗi lượt, tải thêm từ toàn bộ 1.000 món. Tìm có dấu/không dấu, từ khóa gần đúng, bộ lọc bữa/chi phí/phương pháp/nguồn ẩm thực, xem công thức và chọn món.

## Ảnh và bảo toàn dữ liệu
- 108 ảnh thực tế đã đối chiếu metadata, trực quan và lưu trong public/images/dishes, với tên theo ID/hash.
- 892 món còn thiếu ảnh đúng món; hình mặc định được ghi rõ và không tính là ảnh hợp lệ.
- 9 ảnh tải thử không phù hợp đã bị loại. Cache ảnh v6 không dùng lại cache cũ chưa xác minh; lỗi tải có hình mặc định và ghi nhận món.
- Giữ nguyên từng byte của dữ liệu gốc 1.000 món, công thức và phân loại cũ. Giữ tất cả file ảnh và các phiên bản deploy đã có trên GitHub.

## File thay đổi
App.jsx; DishCard.jsx; FoodImage.jsx; DishCatalog.jsx; dishes.js; dish-images.json; dish-images-rejected.json; dishSearch.js và kiểm thử; dishImageResolver.js và kiểm thử; styles.css; package.json/package-lock.json; .gitignore; README.md; src/deploy-version.json; scripts/audit-dish-images.mjs, inspect-local-images.mjs, verify-website.mjs, browser-check.mjs; báo cáo WEBSITE_FIX_REPORT.md, dish-image-audit.json, local-image-check.json, website-verification.json; 108 file ảnh trong public/images/dishes.

## Kiểm tra
- 10 kiểm thử đơn vị đạt; build thành công.
- Chromium kiểm tra tải đủ 1.000 thẻ và đối chiếu từng tên; tìm có dấu/không dấu/gần đúng; công thức/chọn món; menu tuần/đi chợ; màn hình điện thoại; localStorage bị chặn; tình huống ảnh 404 và không dùng lại URL lỗi sau reload.
- Tất cả 108 file ảnh giải mã được, source/build giống nhau, không dùng chung hash giữa các món và trả HTTP 200 dưới /homnayangi/.
- Không có lỗi JavaScript/console trong kiểm thử thông thường. Lỗi 404 được cố tình tạo trong kiểm thử hình mặc định.

## Giới hạn còn lại
892 món chưa có ảnh phù hợp; dữ liệu hiện chưa có món phân loại nước ngoài. Một nguồn công thức bổ sung không truy cập được. Build có cảnh báo bundle lớn hơn 500 kB. Không báo đã hoàn tất bổ sung ảnh cho toàn bộ món.

Website: https://toyotakimes.github.io/homnayangi/
Bản lưu Deploy 3: https://toyotakimes.github.io/homnayangi/versions/deploy-3/
