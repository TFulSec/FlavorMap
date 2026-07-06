# FlavorMap – Thổ Địa Ẩm Thực

Ứng dụng bản đồ ẩm thực, đánh giá nhà hàng, quán ăn chất lượng ở Việt Nam.

## Yêu cầu hệ thống
- Node.js >= 18.x
- SQL Server 2019+ (hoặc SQL Server Express / Azure SQL)
- SQL Server Management Studio (SSMS) để chạy script SQL, hoặc nếu bạn dùng tài khoản cloud giả lập thì không cần.

## Quản trị hệ thống (Database)
- Các file SQL khởi tạo được lưu trong thư mục `backend/sql`:
  - `01_create_tables.sql`
  - `02_seed_data.sql` 
  - `03_sprint3_tables.sql`
- Hiện tại hệ thống đang được cấu hình để dùng dữ liệu mock (giả lập) hoặc cloud. 

## Cài đặt và Chạy

1. Khởi tạo môi trường (nếu chưa có):
   ```bash
   cp .env.example .env
   ```
2. Cài đặt các gói phụ thuộc:
   ```bash
   npm install
   ```
3. Chạy server:
   ```bash
   npm start
   ```

## Truy cập ứng dụng & API

- **Frontend Application**: `http://localhost:3000`
- **Swagger API Docs**: `http://localhost:3000/api-docs`
- **Tài liệu kiểm thử (API Testing guidelines)**: Đọc file `API_TESTING.md` trong thư mục gốc.

