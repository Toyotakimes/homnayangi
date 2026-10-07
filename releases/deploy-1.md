Deploy 1 - Add food list, verified images and deploy versioning

Nội dung sửa và chức năng mới:

- Giữ bản GitHub mới nhất, gồm thực đơn 7 ngày, đi chợ, định lượng nguyên liệu và công thức chi tiết.
- “Chọn cho tôi” hiển thị món nổi bật cùng danh sách 12 món và “Xem thêm”. “Đổi món” đi theo hàng đợi, không lặp trước khi hết tập.
- Tìm kiếm tên món có/không dấu, không phân biệt hoa thường. Trang Món ăn mặc định truy cập đủ 1.000 món với bộ lọc bữa, loại món và giá độc lập.
- Mâm cơm gồm mặn, rau và canh; tổng giá dự kiến phân bổ trong khoảng giá có sẵn và nằm trong ngân sách cho số người đã chọn.
- Thêm 8 ảnh local đã kiểm tra trực quan và metadata, gồm Bánh tiêu. Fallback ảnh hỏng, version cache mới, nguồn/tác giả/giấy phép. Giữ cache cũ nhưng không hiển thị ảnh chưa xác minh.
- Footer lấy “Version: Deploy 1” từ deploy-version.json. Build kiểm tra commit/tag và xuất metadata có source SHA.
- Mỗi Deploy có commit, tag, Release và archive riêng. GitHub Pages giữ website lịch sử dưới versions/deploy-N từ archive gốc; không rebuild/ghi đè asset cũ.

Bug đã sửa:

- Đọc giá sai, chỉ trả một món, giới hạn catalog 120/150 món, dùng chung bộ lọc với trang gợi ý, tìm không dấu thất bại, random lặp món, mâm thiếu món hoặc vượt ngân sách dự kiến.
- URL/cache cũ chưa xác minh có thể hiển thị ảnh sai món; giờ chỉ ảnh được duyệt hoặc có bằng chứng khớp chính xác mới hiển thị. Không xóa cache/dữ liệu gốc.
- Favicon 404 và các điểm tràn responsive.

File đã thay đổi:

- App/giao diện: src/App.jsx, src/styles.css, index.html, vite.config.js, public/favicon.svg.
- Dữ liệu/logic: src/data/dishes.json, src/dishLogic.mjs, src/imageLogic.mjs, src/utils/dishImageResolver.js, src/deploy-version.json, 8 ảnh trong public/images/.
- Version/deploy: .github/workflows/deploy.yml, .gitignore, .openai/hosting.json, package.json, AGENTS.md, DEPLOYING.md, releases/deploy-1.md, scripts/prepare-deploy.mjs, scripts/check-deploy-version.mjs, scripts/build-deploy.mjs, scripts/assemble-pages.mjs, scripts/github-release.mjs.
- Kiểm tra/audit: scripts/logic.test.mjs, scripts/browser-check.mjs, src/utils/dishImageResolver.test.js, scripts/audit-data.mjs, scripts/find-images.mjs, scripts/download-candidates.mjs, scripts/apply-reviewed-images.mjs, reports/.

Build/test:

- Build PASS; còn cảnh báo bundle >500 kB, không có lỗi build.
- 12 kiểm tra logic/ảnh PASS. 6 ca yêu cầu, yêu thích, thực đơn 7 ngày và đi chợ được kiểm tra trên Chrome localhost.
- Responsive 1440/768/390/320 px PASS; 3/2/1 cột, không tràn ngang. Console errors trong kiểm tra luồng bình thường: 0.
- Ca cố tình chặn ảnh xác nhận fallback hoạt động, không vòng lặp tải.
- Giữ đủ 1.000 bản ghi và mọi trường dữ liệu gốc ngoài việc bổ sung ảnh.

Giới hạn còn lại:

- 8 món có ảnh xác minh; 992 còn placeholder. Nguồn ảnh trả HTTP 429 nên việc bổ sung ảnh cho toàn database chưa hoàn tất; không dùng ảnh sai để lấp chỗ trống.
- Dữ liệu gốc: thiếu giá 0; thiếu nguyên liệu cụ thể 171; thiếu trường cách nấu 0 nhưng 324 hướng dẫn còn chung chung; thiếu category/bữa 0; thiếu thời gian nấu 1.000. Lớp công thức mới nhất từ GitHub có 18 công thức cụ thể và 982 công thức suy luận, được ghi rõ là ước tính.
- Chi phí mâm cơm là dự kiến từ khoảng giá, không phải cam kết giá thị trường tối đa.

Website:

- Bản Deploy 1 lưu riêng: https://toyotakimes.github.io/homnayangi/versions/deploy-1/
- Bản mới nhất trên GitHub Pages: https://toyotakimes.github.io/homnayangi/
- Sites (riêng tư): https://homnayangi.luuthuy994vp.chatgpt.site
- Localhost: http://127.0.0.1:5173/

Tag: deploy-1. Archive deploy-1.tar.gz chứa đúng build của commit được tag, kèm deploy-version.json để kiểm tra số Deploy và commit SHA.
