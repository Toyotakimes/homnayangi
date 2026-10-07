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
Ảnh không lấy ngẫu nhiên và không scrape Google Images. Khi thẻ món được xem, ứng dụng tìm theo thứ tự trên Wikimedia Commons rồi Openverse bằng tên món (bỏ dấu); Openverse chỉ nhận tiêu đề khớp toàn bộ từ khóa món, tags xác nhận ngữ cảnh thực phẩm/nguyên liệu và license `CC BY`, `CC BY-SA`, `CC0` hoặc Public Domain. Ảnh khác, tag/logo/phong cảnh không phù hợp, license không rõ hoặc confidence dưới 80 sẽ dùng placeholder. Ảnh được ghi nguồn/creator/license và liên kết trang gốc; không tải/copy file về repository. Search cache dùng `foodimg_v4_<dish.id>` và negative cache hết hạn sau 24 giờ. Openverse anonymous API có rate limit; ảnh được tìm khi người dùng xem từng món, không thể bảo đảm phủ đủ 1.000 món trong một lượt. Muốn tự nhập ảnh cần metadata xác minh, `image.verified: true` và confidence >=80.

## Nâng cấp nên làm tiếp
1. Backend + tài khoản người dùng.
2. Giá nguyên liệu theo khu vực/thời gian.
3. Công thức chi tiết theo định lượng người ăn.
4. Ảnh thật cho 1.000 món.
5. Thực đơn 7 ngày + danh sách đi chợ.
6. Món nước ngoài.
7. Tìm quán gần người dùng.
