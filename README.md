# FlavorMap – Thổ Địa Ẩm Thực

FlavorMap là ứng dụng web hỗ trợ khám phá quán ăn địa phương, tìm kiếm theo nhu cầu cá nhân, đánh giá quán và bình chọn địa điểm theo nhóm. Nhánh `sprint4-5` tích hợp các chức năng quản trị, Cổng Chủ quán, quy trình xác minh quán, kiểm duyệt đánh giá, triển khai production và các bản sửa lỗi cuối dự án.

## Thành viên

- Nguyễn Bảo Khánh – BIT250195
- Đỗ Đức Trí – BIT250347

## Chức năng chính

### Người dùng

- Đăng ký, đăng nhập, đăng xuất, refresh token và quản lý hồ sơ.
- Tìm kiếm, lọc và xem chi tiết quán, thực đơn, giờ mở cửa và vị trí trên bản đồ.
- Lưu quán yêu thích; gửi, sửa hoặc xóa đánh giá.
- Báo cáo đánh giá vi phạm và báo quán chưa có trên hệ thống.
- Nhận gợi ý quán theo vị trí, loại món, ngân sách và nhu cầu.
- Tạo hoặc tham gia Phòng bình chọn bằng mã 6 ký tự.
- Bấm lại quán đã chọn để bỏ phiếu; chọn quán khác để chuyển phiếu.

### Chủ quán

- Gửi hồ sơ tạo mới hoặc nhận quyền quản lý quán.
- Theo dõi trạng thái xét duyệt và bổ sung hồ sơ khi được yêu cầu.
- Quản lý thông tin quán, trạng thái hoạt động, lịch mở cửa, nhóm món, thực đơn và hình ảnh.
- Cập nhật trạng thái Vắng/Vừa/Đông; trạng thái tự hết hiệu lực sau 2 giờ theo UTC.
- Phản hồi đánh giá, xem dashboard và xuất báo cáo CSV/XLSX.

### Quản trị viên

- Xem dashboard tổng quan.
- Xét duyệt hồ sơ Chủ quán và gán quyền sở hữu quán.
- Quản lý quán, thực đơn, người dùng, vai trò và trạng thái tài khoản.
- Quản lý Báo quán chưa có và kiểm duyệt đánh giá bị báo cáo.
- Truy cập Cổng Chủ quán để kiểm tra và hỗ trợ vận hành.

## Công nghệ

- **Frontend:** HTML5, CSS3, JavaScript, Leaflet, OpenStreetMap/Nominatim.
- **Backend:** Node.js, Express, JWT, Joi, Multer, Helmet, CORS, Express Rate Limit.
- **Cơ sở dữ liệu:** Microsoft SQL Server qua package `mssql`.
- **Tài liệu API:** Swagger/OpenAPI.
- **Xuất báo cáo:** CSV và XLSX bằng JSZip.
- **Triển khai:** IIS/httpPlatformHandler trên SmarterASP.NET.

## Cấu trúc thư mục

```text
FlavorMap/
├── backend/
│   ├── src/                 # API, middleware, service và Swagger
│   └── uploads/submissions/ # Dữ liệu runtime; chỉ giữ .gitkeep trên GitHub
├── frontend/
│   ├── assets/              # CSS, JavaScript và hình giao diện
│   └── pages/               # Các trang HTML
├── sql/                     # Migration và script kiểm tra Sprint 4–5
├── tests/                   # Kiểm thử hồi quy và mock test
├── .env.example             # Mẫu cấu hình, không chứa thông tin thật
├── package.json
└── web.config               # Cấu hình triển khai IIS
```

## Yêu cầu môi trường

- Node.js 22 trở lên.
- npm 10 trở lên.
- Microsoft SQL Server/SQL Server Express.
- SQL Server Management Studio để khôi phục database và chạy migration.

## Cài đặt và chạy local

```powershell
git clone <URL_REPOSITORY>
cd <THU_MUC_REPOSITORY>
git switch sprint4-5
npm install
Copy-Item .env.example .env
```

Cập nhật `.env` theo SQL Server trên máy, sau đó chạy:

```powershell
npm run check
npm run test:all
npm start
```

Các địa chỉ local:

- Trang chủ: `http://localhost:3000/pages/index.html`
- Swagger UI: `http://localhost:3000/api-docs/`
- OpenAPI JSON: `http://localhost:3000/api-docs/openapi.json`

## Cấu hình môi trường

Các biến chính trong `.env`:

```env
PORT=3000
CLIENT_URL=http://localhost:3000,https://tfulsec.site,https://www.tfulsec.site
NODE_ENV=development

DB_SERVER=localhost
DB_PORT=1433
DB_NAME=FlavorMap
DB_USER=sa
DB_PASSWORD=change-me
DB_ENCRYPT=false
DB_TRUST_CERT=true

JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
VIEW_HASH_SECRET=replace-with-another-long-random-secret
```

Không commit `.env`, mật khẩu database, JWT secret, file `.bak`, dữ liệu người dùng hoặc thư mục upload thật.

## Cơ sở dữ liệu Sprint 4–5

Nhánh này chứa các migration bổ sung cho database FlavorMap đã có từ các Sprint trước:

1. `sql/06_product_workflow_migration.sql`
2. `sql/07_review_moderation.sql`

Sau khi chạy migration, có thể kiểm tra bằng:

1. `sql/test_product_workflow.sql`
2. `sql/test_review_moderation.sql`

Khi cài mới hoàn toàn, cần khôi phục database nền của Sprint 1–3 trước khi chạy hai migration trên. Nên tạo bản backup `.bak` trước mọi thay đổi schema.

## Kiểm thử

```powershell
npm run check
npm run test:sprint4
npm run test:owner-portal
npm run test:product-workflow
npm run test:review-moderation
npm run test:usability
npm run test:auth-navigation
npm run test:swagger
npm run test:vote-toggle
```

Chạy toàn bộ:

```powershell
npm run test:all
```

## Triển khai

Production hiện dùng:

- Website: `https://tfulsec.site/`
- Swagger: `https://tfulsec.site/api-docs/`

Khi triển khai SmarterASP.NET:

1. Upload mã nguồn nhưng không upload `.env` local.
2. Tạo `.env` production trực tiếp trên hosting.
3. Giữ `web.config` tại thư mục gốc.
4. Cài dependency bằng `npm install --omit=dev`.
5. Khởi động lại website/Application Pool và kiểm tra Swagger cùng các API chính.

## GitHub

- GitHub Project: https://github.com/users/TFulSec/projects/1/views/1
- Nhánh tích hợp Sprint 4–5: `sprint4-5`

## Lưu ý bảo mật

- Không đưa thông tin xác thực thật lên GitHub.
- Nếu `.env` từng bị commit, cần thay đổi ngay mật khẩu database, `JWT_SECRET` và `VIEW_HASH_SECRET`.
- Không chỉnh sửa lịch sử commit chỉ để xóa tên thành viên cũ; dùng commit mới để thể hiện phiên bản hoàn thiện.
