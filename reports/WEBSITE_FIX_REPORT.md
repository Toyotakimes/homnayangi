# Báo cáo sửa Hôm Nay Ăn Gì

Đã sửa tìm kiếm và danh sách món; bản sửa được chuẩn bị cho Deploy 3. Chưa hoàn tất bổ sung ảnh cho toàn bộ món.

- 1.000 món giữ nguyên từng byte trong dishes.json, công thức và phân loại cũ không bị xóa.
- Hôm nay → Món đơn và Món ăn có danh sách thẻ, 20 món mỗi lượt, tải thêm; tên có dấu/không dấu và gần đúng; bộ lọc bữa, giá, phương pháp và nguồn ẩm thực.
- Có nút chọn món, mở công thức với nguyên liệu, cách nấu, chi phí và thời gian.
- Dữ liệu hiện có đều là món Việt. Bộ lọc nước ngoài có thông báo rõ khi chưa có dữ liệu.
- 108 ảnh thực tế đã đối chiếu metadata và trực quan, lưu cùng website. 892 món còn thiếu ảnh phù hợp và hiển thị hình mặc định.
- Đã loại 9 ảnh tải thử không phù hợp; không dùng cache cũ chưa xác minh và không dùng Wikipedia/Wikimedia.
- Tất cả 108 file ảnh giải mã được, trùng khớp nội dung source/build, không dùng chung hash cho món khác, và trả HTTP 200 dưới /homnayangi/. Không có lỗi tải ảnh local còn lại trong kiểm thử.
- 1 nguồn bổ sung (savourydays.com) không truy cập được; đây là lỗi nguồn tìm kiếm, không phải file ảnh được dùng.
- 10 kiểm thử đơn vị đã đạt. Kiểm thử Chromium đã tải đủ 1.000 thẻ, đối chiếu từng tên, kiểm tra tìm kiếm, công thức, chọn món, menu tuần/đi chợ, giao diện điện thoại và localStorage bị chặn. Tình huống ảnh 404 chuyển sang hình mặc định, ghi nhận đúng món và chặn URL lỗi sau reload cũng đã đạt. Không có lỗi JavaScript trong các kịch bản này.
- Build thành công, có cảnh báo bundle lớn hơn 500 kB.

Báo cáo chi tiết: dish-image-audit.json và website-verification.json.

GitHub/Deploy: đã đồng bộ thay đổi mới của Deploy 2, giữ nguyên các phiên bản cũ và chuẩn bị Deploy 3 theo quy trình repository. Website: https://toyotakimes.github.io/homnayangi/ ; Release: https://github.com/Toyotakimes/homnayangi/releases/tag/deploy-3 . Trạng thái triển khai và kiểm tra bản công khai được xác nhận riêng sau khi push.
