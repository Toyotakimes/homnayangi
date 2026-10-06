# Ảnh món ăn

`src/utils/dishImageResolver.js` quản lý nguồn theo thứ tự trong `providers`.
Hiện có TheMealDB; các nguồn khác cần validator riêng trước khi bổ sung.
FoodImage không còn gọi Wikimedia/Openverse hoặc bộ đối chiếu từ khóa cũ.

Chỉ nhận tên món đầy đủ trùng khớp sau chuẩn hóa dấu, chữ hoa và dấu câu.
Không bỏ cách chế biến, nguyên liệu hay biến thể. `imageAliases` là mảng tên
tương đương đầy đủ đã được kiểm duyệt cho từng món; không dùng dịch từng từ.
Không tự gán alias chung như Beef Pho cho Phở bò tái hoặc Phở bò chín.

TheMealDB phải có ID, hướng dẫn, nguyên liệu và ảnh HTTPS trong thư mục
`www.themealdb.com/images/media/meals/`. Kết quả mơ hồ, không khớp hoặc lỗi
sẽ hiển thị placeholder. Đây là kiểm tra dữ liệu nguồn, không phải nhận diện
nội dung pixel; cần kiểm duyệt nếu dữ liệu nguồn gắn nhầm ảnh.

Ảnh thủ công cần source `manual`/`owner-upload`, verified true, confidence >=80,
URL HTTPS và title trùng tên/alias đầy đủ. Không suy diễn source thành manual.

Cache v5 không đọc cache cũ. Cache lưu bằng chứng để kiểm tra lại; ảnh đúng
hết hạn sau 7 ngày, không tìm thấy sau 24 giờ, lỗi mạng/ảnh sau 1 phút.
localStorage bị khóa không ngăn hiển thị. Các yêu cầu trùng được gộp lại.

Cấu hình `VITE_THEMEALDB_API_KEY` trong môi trường Vite nếu có key riêng;
mặc định dùng key phát triển `1`. Quy định nguồn: https://www.themealdb.com/api.php

Kiểm tra: `node --test src/utils/dishImageResolver.test.js` và `npm run build`.
