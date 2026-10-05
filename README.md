# homnayangi

MVP website **Hôm Nay Ăn Gì?**

## Có sẵn
- Database 1.000 món Việt.
- Lọc theo sáng / trưa / tối / ăn vặt.
- Lọc theo ngân sách.
- Chọn số người.
- Random món.
- Tạo mâm cơm gồm món mặn + canh + rau.
- Không ưu tiên lặp lại các món vừa chọn gần đây.
- Yêu thích và lịch sử lưu bằng localStorage.
- Responsive cho điện thoại.

## Chạy project
```bash
npm install
npm run dev
```

Mở địa chỉ Vite hiển thị trong Terminal (thường là http://localhost:5173).

## Ảnh món ăn
Database có trường `image` và `imageKeyword`.
Hiện V1 dùng ảnh placeholder khi chưa có `image`.
Để có ảnh thật cho từng món, điền URL ảnh vào trường `image` trong:
`src/data/dishes.json`

## Nâng cấp nên làm tiếp
1. Backend + tài khoản người dùng.
2. Giá nguyên liệu theo khu vực/thời gian.
3. Công thức chi tiết theo định lượng người ăn.
4. Ảnh thật cho 1.000 món.
5. Thực đơn 7 ngày + danh sách đi chợ.
6. Món nước ngoài.
7. Tìm quán gần người dùng.
