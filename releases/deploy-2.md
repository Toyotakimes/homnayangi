Deploy 2 - Restore application to ba24969

Khôi phục theo yêu cầu về bản ba24969d27557ad6c6ad9b570d4bf0e02864f6ea, ngày 06/10/2026 lúc 16:50:10 (giờ Việt Nam).

Nội dung sửa:

- Khôi phục nguyên bản App, database 1.000 món, giao diện CSS và logic/cache ảnh của ba24969.
- Giữ thực đơn 7 ngày, đi chợ, công thức chi tiết, yêu thích và lịch sử theo bản ngày 6/10.
- Chức năng danh sách 12 món, tìm không dấu, mâm cơm và ảnh bổ sung từ Deploy 1 không còn được áp dụng trong bản này; đây là rollback có chủ đích.
- Giữ hệ thống commit/tag/Release, archive và website lịch sử. Footer hiển thị Version: Deploy 2 từ file version.
- Không force push, sửa lịch sử, xóa tag, Release hay archive Deploy 1. Khôi phục bằng commit mới.

File thay đổi:

- src/App.jsx: về bản ba24969, chỉ thêm import/footer version.
- src/data/dishes.json, src/styles.css, src/utils/dishImageResolver.js, src/utils/dishImageResolver.test.js: khớp nguyên bản ba24969.
- src/deploy-version.json: Deploy 2 / deploy-2.
- package.json: kiểm tra logic ảnh đúng bản khôi phục.
- scripts/rollback-check.mjs, reports/deploy-2-rollback-check.json, releases/deploy-2.md: đối chiếu nguồn và kiểm tra bản rollback.

Chức năng mới / bug fix: không bổ sung chức năng hoặc sửa lỗi ứng dụng ngoài yêu cầu khôi phục.

Build/test:

- Build PASS. Còn cảnh báo bundle lớn, không có lỗi build.
- 6 kiểm tra ảnh của bản ba24969 PASS.
- So sánh các file nguồn với commit đích PASS; App chỉ khác phần version.
- Chrome localhost: trang gợi ý, catalog, thực đơn 7 ngày, đi chợ và lưu checkbox sau reload PASS.
- Desktop/tablet/mobile không tràn ngang. Console errors trong các luồng kiểm tra: 0.

Website:

- Deploy 2 riêng: https://toyotakimes.github.io/homnayangi/versions/deploy-2/
- Deploy 1 vẫn giữ: https://toyotakimes.github.io/homnayangi/versions/deploy-1/
- Bản mới nhất: https://toyotakimes.github.io/homnayangi/
- Sites riêng tư: https://homnayangi.luuthuy994vp.chatgpt.site
- Localhost: http://127.0.0.1:5173/

Tag: deploy-2. Archive deploy-2.tar.gz lưu build của commit được tag, cùng metadata số Deploy và commit SHA.
