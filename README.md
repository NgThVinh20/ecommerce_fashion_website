# Backend sàn thương mại điện tử thời trang

Backend cho sàn thương mại điện tử thời trang nhiều người bán.
Công nghệ: Express.js 5, TypeScript, PostgreSQL 16 (Prisma ORM), Redis 7.

## Yêu cầu

- Node.js 22 LTS, Yarn 1.22
- Docker Desktop (đã bật WSL 2)

## Cài đặt lần đầu

```bash
# 1. Cài thư viện
yarn install

# 2. Tạo file cấu hình từ file mẫu, sau đó mở .env và điền giá trị thật
copy .env.example .env

# 3. Khởi động PostgreSQL và Redis
docker compose up -d

# 4. Tạo bảng trong CSDL theo các migration
yarn prisma migrate deploy

# 5. Tạo tài khoản admin (lấy từ ADMIN_EMAIL, ADMIN_PASSWORD trong .env)
yarn prisma db seed

# 6. Chạy server
yarn dev
```

Kiểm tra: mở http://localhost:3000/health

## Lệnh hằng ngày

| Lệnh | Tác dụng |
|---|---|
| `docker compose up -d` | Bật PostgreSQL và Redis |
| `yarn dev` | Chạy server, tự khởi động lại khi sửa code |
| `docker compose stop` | Tắt PostgreSQL và Redis (dữ liệu vẫn giữ) |

## Docker

| Lệnh | Tác dụng |
|---|---|
| `docker compose ps` | Xem trạng thái các container |
| `docker compose logs -f postgres` | Xem log PostgreSQL |
| `docker compose down` | Xóa container (dữ liệu vẫn giữ trong volume) |
| `docker compose down -v` | ⚠️ Xóa container **và toàn bộ dữ liệu** |

## Prisma (cơ sở dữ liệu)

| Lệnh | Tác dụng |
|---|---|
| `yarn prisma migrate dev --name <ten>` | Sau khi sửa `schema.prisma`: tạo migration mới và áp dụng vào CSDL |
| `yarn prisma migrate deploy` | Áp dụng các migration có sẵn (máy mới, server thật) |
| `yarn prisma generate` | Sinh lại Prisma Client |
| `yarn prisma db seed` | Tạo dữ liệu ban đầu (tài khoản admin) |
| `yarn prisma studio` | Mở giao diện web xem dữ liệu |
| `yarn prisma migrate reset` | ⚠️ Xóa sạch CSDL, chạy lại toàn bộ migration và seed |

Quy tắc: chỉ thay đổi cấu trúc bảng qua `schema.prisma` và migration, không sửa trực tiếp trong CSDL.

## Build và kiểm tra

| Lệnh | Tác dụng |
|---|---|
| `yarn typecheck` | Kiểm tra lỗi kiểu TypeScript |
| `yarn build` | Biên dịch ra thư mục `dist/` |
| `yarn start` | Chạy bản đã build |

## Biến môi trường

Xem `.env.example`. Không đưa file `.env` lên Git.

## Cấu trúc thư mục

```
src/
├── config/        Đọc và kiểm tra biến môi trường
├── lib/           Prisma, Redis, JWT
├── middlewares/   Xác thực, phân quyền, xử lý lỗi
└── modules/       Mỗi mô-đun: routes, controller, service, schema
prisma/            schema.prisma, migrations, seed.ts
postman/           Bộ request kiểm thử API
```

## API hiện có

| Phương thức | Đường dẫn | Yêu cầu đăng nhập |
|---|---|---|
| POST | /api/v1/auth/register | Không |
| POST | /api/v1/auth/login | Không |
| POST | /api/v1/auth/refresh | Không |
| POST | /api/v1/auth/logout | Không |
| GET | /api/v1/auth/me | Có |
