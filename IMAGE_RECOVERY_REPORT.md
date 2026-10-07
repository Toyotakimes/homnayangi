# Sự cố ảnh sau commit 7b9985e

## Nguyên nhân đã xác minh trước khi sửa

- `src/components/FoodImage.jsx` ở commit 7b9985e bỏ đọc `foodimg_v4_<id>`
  và bỏ tìm Wikimedia/Openverse; chuyển sang resolver chỉ có TheMealDB.
- `src/utils/dishImageResolver.js:20` tạo khóa v5 nhưng không migration.
  Hàm `manualImage` (dòng 40 của commit) chỉ nhận manual/owner-upload,
  verified true, confidence >=80, title trùng tên. Ảnh có sẵn từ nguồn khác
  hoặc chưa verified không được dùng.
- `src/App.jsx:80` có effect xóa mọi `foodimg_*` ngoài v4. Đoạn này đã có
  ở bản trước, nhưng bản mới vẫn giữ nó nên cả v5 cũng bị xóa mỗi lần mở trang;
  v2/v3 có thể đã bị xóa từ trước.
- `src/data/dishes.js:9` đã lọc URL chưa verified ngay từ bản trước.
  Bản phục hồi bỏ lọc đó, giữ metadata verified đúng giá trị gốc.

## BEFORE / AFTER

| Hạng mục | c632859 trước deploy | 7b9985e lỗi | Bản phục hồi |
| --- | --- | --- | --- |
| URL trong JSON | 0/1.000 | 0/1.000 | Không đổi dữ liệu |
| Alias trong JSON | 0 | 0 | Không tự thêm |
| Cache được đọc | v4 | v5 | v2, v3, v4, bản migration, v5 |
| URL chưa verified | Bị lọc | Bị lọc | Giữ để hiển thị |
| Dọn cache | Xóa ngoài v4 | Xóa ngoài v4, gồm v5 | Bỏ hoàn toàn |
| Nguồn tìm kiếm | Wikimedia/Openverse | TheMealDB | Giữ TheMealDB; ưu tiên phục hồi |

Số ảnh thực tế từng hiển thị phụ thuộc localStorage riêng của từng trình duyệt.
Không có browser được kết nối nên chưa đo được số này; không suy diễn là 0
chỉ vì JSON trống. Không thể khôi phục cache đã bị xóa từ Git vì URL đó không
được lưu trong repo. Các cache còn tồn tại được dùng và sao chép không phá hủy.

## Network, key và đường dẫn

- Kiểm tra production HTML: asset `/homnayangi/assets/index-DAS0eYdf.js` tồn tại
  trong HTML lỗi; Vite base vẫn là `/homnayangi/`, không đổi bởi commit ảnh.
- HTTP TheMealDB search key phát triển 1: `pho bo tai`, `pho ga`, `bun bo hue`
  đều 200, `Access-Control-Allow-Origin: *`, body `{"meals":null}`.
  Đây là không có kết quả, không phải CORS/key lỗi đối với các request đã kiểm tra.
- Workflow không truyền `VITE_THEMEALDB_API_KEY`. Source fallback key phát triển 1;
  chưa thêm key riêng hoặc secret. Không có Pexels/Pixabay trong mã hiện tại.
- URL không được tìm thấy là null; component dùng SVG data URL placeholder,
  không gán undefined/null vào img src. SVG fallback không đổi.
- Chưa đọc được Console/Network hay localStorage của browser người dùng;
  kiểm tra HTTP không thay thế hoàn toàn kiểm tra trình duyệt.

## Phục hồi và kiểm tra

Sửa App.jsx, data/dishes.js, dishImageResolver.js, FoodImage.jsx và kiểm thử resolver.
Không sửa dishes.json, yêu thích, lịch sử, lịch tuần hoặc danh sách đi chợ.
6 kiểm thử kiểm tra tên/biến thể, URL hiện có, migration cache không xóa,
cache miss v5 không che cache cũ, và không gọi fetch khi đã có ảnh.
Giữ lazy search theo IntersectionObserver; không chạy search trên toàn bộ JSON.
