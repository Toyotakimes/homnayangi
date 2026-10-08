# homnayangi

MVP website **Hôm Nay Ăn Gì?**

## Có sẵn
- Database 1.000 món Việt (giữ nguyên trong `src/data/dishes.json`).
- Lọc theo sáng / trưa / tối / ăn vặt, ngân sách và số người.
- Chọn món ngẫu nhiên; tạo mâm cơm gồm món chính + rau + canh, có chi phí và thời gian ước tính.
- Công thức có nguyên liệu, gia vị, định lượng theo số người, bước nấu và mẹo; công thức biên tập ưu tiên nằm trong `src/data/recipes/featured.js`, các món khác dùng hướng dẫn tham khảo theo loại món.
- Thực đơn 7 ngày cố gắng hạn chế lặp món và luân phiên nhóm đạm; tự cộng tổng chi phí.
- Danh sách đi chợ cộng định lượng từ thực đơn tuần.
- Yêu thích và lịch sử lưu bằng localStorage.
- Responsive cho điện thoại.

## Chạy project
```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong Terminal (thường là http://localhost:5173).

## Ảnh món ăn
Ảnh bổ sung nằm trong `src/data/dish-images.json`; dữ liệu gốc 1.000 món được giữ nguyên. File ảnh được lưu ở `public/images/dishes`, tên chứa mã món và hash nội dung. Vite thêm base `/homnayangi/` khi hiển thị và copy file vào bản build. Không dùng cache ảnh v2–v5 chưa xác minh. Khi ảnh tải lỗi, ứng dụng dùng hình mặc định, chặn URL lỗi và ghi nhận trong `homnayangi_image_issues_v6` của localStorage.

`npm run audit:images` đối chiếu toàn bộ tên món không dấu với kho công thức của các nguồn đã cấu hình, kiểm tra metadata, ít nhất hai từ khóa khi tên có hai từ trở lên, tải và kiểm tra file ảnh, chống dùng lại cùng file cho món khác. Ảnh mới có `visualReview: pending` và chưa được hiển thị cho đến khi kiểm tra trực quan. Ảnh bị loại được ghi ở `src/data/dish-images-rejected.json`. Không sử dụng nguồn Wikipedia/Wikimedia.

Kết quả hiện tại: 108 ảnh đã đối chiếu trực quan; 892 món còn thiếu ảnh thực tế phù hợp. Hình mặc định không được tính là ảnh món ăn hợp lệ. Báo cáo từng món ở `reports/dish-image-audit.json`. Nguồn công thức được ghi cạnh ảnh và trong manifest.

## Kiểm tra trước khi triển khai
- `npm test`: kiểm thử tìm kiếm và cache ảnh.
- `npx playwright install chromium`: chuẩn bị trình duyệt kiểm thử.
- `npm run test:website`: build và kiểm tra danh sách đủ 1.000 món, tìm có dấu/không dấu/gần đúng, tải thêm 20 món, xem công thức, chọn món, tính tương thích điện thoại, ảnh dưới đường dẫn GitHub Pages và bảo toàn dữ liệu gốc.
- `npm run audit:local-images`: giải mã toàn bộ ảnh và tạo bảng ảnh để đối chiếu.

Báo cáo kiểm thử bản build ở `reports/website-verification.json`. Kiểm tra bản build local không thay thế kiểm tra website sau triển khai.

## Nâng cấp nên làm tiếp
1. Backend + tài khoản người dùng.
2. Giá nguyên liệu theo khu vực/thời gian.
3. Công thức chi tiết theo định lượng người ăn.
4. Ảnh thật cho 1.000 món.
5. Thực đơn 7 ngày + danh sách đi chợ.
6. Món nước ngoài.
7. Tìm quán gần người dùng.
