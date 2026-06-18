# FlavorMap – Thổ Địa Ẩm Thực

## Yêu cầu hệ thống
- Node.js >= 18.x
- SQL Server 2019+ (hoặc SQL Server Express)
- SQL Server Management Studio (SSMS) để chạy script SQL

## Cài đặt Backend

cd backend
npm install

# Tạo file .env từ .env.example
copy .env.example .env
# Điền thông tin SQL Server vào .env

# Chạy SQL scripts trong SSMS theo thứ tự:
# 1. sql/01_create_tables.sql
# 2. sql/02_seed_data.sql

npm run dev   # Chạy dev với nodemon
# hoặc
npm start     # Chạy production

## Chạy Frontend
# Dùng Live Server (VS Code extension) hoặc:
# npx serve frontend -p 5500

## Truy cập
- Frontend : http://localhost:5500
- Backend  : http://localhost:5000
- API docs : xem phần API Endpoints ở trên
