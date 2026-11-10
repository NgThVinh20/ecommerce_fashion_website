# Backend sàn thương mại điện tử thời trang

Backend cho sàn thương mại điện tử thời trang nhiều người bán.
Công nghệ: Express.js 5, TypeScript, PostgreSQL 16 (Prisma ORM), Redis 7, Zod, Nodemailer (Gmail SMTP).

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
#    Chạy lại lệnh này sẽ cập nhật mật khẩu admin theo .env
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

Xem `.env.example`. Không đưa file `.env` lên Git. Máy phát triển và máy chủ thật dùng **các giá trị bí mật khác nhau**.

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL (Docker dùng cổng 5433) |
| `REDIS_URL` | Có | Chuỗi kết nối Redis |
| `JWT_SECRET` | Có | Chuỗi bí mật ký access token, tối thiểu 32 ký tự |
| `JWT_EXPIRES_IN` | Không (mặc định `15m`) | Thời hạn access token |
| `REFRESH_TOKEN_TTL_DAYS` | Không (mặc định `7`) | Thời hạn refresh token (ngày) |
| `PORT` | Không (mặc định `3000`) | Cổng chạy server |
| `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Khi chạy seed | Tài khoản admin hệ thống |
| `SMTP_USER`, `SMTP_PASS` | Không | Gmail và App Password 16 ký tự để gửi email |
| `SMTP_HOST`, `SMTP_PORT` | Không (mặc định `smtp.gmail.com`, `465`) | Máy chủ gửi thư; mạng chặn cổng 465 thì dùng `587` |
| `MAIL_FROM` | Không | Tên và địa chỉ người gửi, ví dụ `"Fashion Market <abc@gmail.com>"` |

### Gửi email (OTP)

- **Chưa khai báo** `SMTP_USER`, `SMTP_PASS`: khi phát triển, server không gửi thư mà in nội dung (có mã OTP) ra terminal. Khi chạy production thì báo lỗi.
- **Gửi Gmail thật:** bật Xác minh 2 bước cho Gmail → tạo Mật khẩu ứng dụng tại myaccount.google.com/apppasswords → điền vào `SMTP_USER`, `SMTP_PASS` (bỏ dấu cách) → khởi động lại `yarn dev`.

## Cấu trúc thư mục

```
src/
├── config/        Đọc và kiểm tra biến môi trường (env.ts)
├── lib/           Prisma, Redis, JWT, gửi email (mailer), mã OTP (otp), tạo slug
├── middlewares/   Xác thực, phân quyền, kiểm tra shop đang hoạt động, xử lý lỗi
├── modules/       Mỗi mô-đun: routes, controller, service, schema
│   ├── auth/        Đăng ký, đăng nhập, token, xác thực email
│   ├── categories/  Loại mặt hàng của sàn
│   └── shops/       Shop, hồ sơ người bán
└── routes/        Gom route: index (/api/v1), admin (/admin), seller (/seller)
prisma/            schema.prisma, migrations, seed.ts
postman/           Bộ request kiểm thử API
```

Các nhóm route:
- `/admin/...`: kiểm tra đăng nhập và quyền ADMIN một lần cho cả nhóm.
- `/seller/...`: kiểm tra đăng nhập, quyền SELLER và shop đang ACTIVE; `id_shop` lấy từ server, không nhận từ client.

## Định dạng lỗi

Mọi lỗi trả về dạng:

```json
{ "error": { "code": "SHOP_EXISTS", "message": "Tài khoản đã đăng ký gian hàng" } }
```

| Mã HTTP | Khi nào |
|---|---|
| 400 | Dữ liệu sai hình thức (`VALIDATION_ERROR`, kèm `details`), JSON hỏng (`INVALID_JSON`) |
| 401 | Chưa đăng nhập, token sai hoặc hết hạn, sai email/mật khẩu |
| 403 | Không đủ quyền, tài khoản bị khóa, email chưa xác thực, shop chưa được duyệt |
| 404 | Không tìm thấy |
| 409 | Trùng dữ liệu đã có (email, shop, tên shop, loại mặt hàng), hoặc dữ liệu vừa bị thay đổi bởi người khác |
| 422 | Đúng hình thức nhưng vi phạm quy tắc nghiệp vụ (OTP sai/hết hạn, chưa đủ 30 ngày để đổi, duyệt shop không ở trạng thái chờ, quá 3 cấp loại mặt hàng...) |
| 429 | Gọi quá nhiều lần (gửi OTP liên tục, nhập sai OTP quá 5 lần) |
| 500 | Lỗi hệ thống không lường trước |

## API hiện có

Tất cả có tiền tố `/api/v1`. Đường dẫn không tồn tại trả 404 `NOT_FOUND`.

### Xác thực

| Phương thức | Đường dẫn | Quyền | Chức năng |
|---|---|---|---|
| POST | /auth/register | Công khai | Đăng ký, tự gửi mã OTP về email |
| POST | /auth/email/verify | Công khai | Nhập `{ email, otp }` để xác thực email |
| POST | /auth/email/send-otp | Công khai | Gửi lại mã OTP (`{ email }`), tối đa 1 lần/phút |
| POST | /auth/login | Công khai | Đăng nhập (email phải đã xác thực), trả access token + refresh token |
| POST | /auth/refresh | Công khai | Đổi refresh token lấy cặp token mới |
| POST | /auth/logout | Công khai | Hủy refresh token |
| GET | /auth/me | Đã đăng nhập | Thông tin tài khoản |

Mã OTP: 6 chữ số, hiệu lực 5 phút, sai tối đa 5 lần. Chưa xác thực email thì đăng nhập trả 403 `EMAIL_NOT_VERIFIED`.

### Loại mặt hàng của sàn

| Phương thức | Đường dẫn | Quyền | Chức năng |
|---|---|---|---|
| GET | /categories | Công khai | Cây loại mặt hàng (tối đa 3 cấp) |
| POST | /admin/categories | ADMIN | Thêm loại mặt hàng |
| PATCH | /admin/categories/:id | ADMIN | Sửa tên, tỷ lệ hoa hồng |
| DELETE | /admin/categories/:id | ADMIN | Xóa (không xóa được khi còn loại con) |

### Shop

| Phương thức | Đường dẫn | Quyền | Chức năng |
|---|---|---|---|
| POST | /shops | CUSTOMER | Đăng ký mở shop (thông tin shop, mã số thuế, tài khoản ngân hàng), trạng thái PENDING |
| GET | /shops/info | Đã đăng nhập | Xem shop của mình, kể cả khi chưa duyệt (kèm lý do từ chối / khóa nếu có) |
| PATCH | /shops/info | CUSTOMER | Sửa hồ sơ đăng ký khi đang chờ duyệt; nếu đang bị từ chối thì sửa xong tự gửi lại (về PENDING) |
| GET | /shops/:slug | Công khai | Trang công khai của shop (chỉ shop ACTIVE, không lộ số dư, ngân hàng) |
| GET | /seller/shop | SELLER, shop ACTIVE | Xem shop đang quản lý |
| PATCH | /seller/shop | SELLER, shop ACTIVE | Sửa mô tả, địa chỉ, số điện thoại; đổi tên shop tối đa 30 ngày/lần |
| POST | /seller/shop/bank/otp | SELLER, shop ACTIVE | Gửi mã OTP về email để đổi tài khoản ngân hàng |
| PATCH | /seller/shop/bank | SELLER, shop ACTIVE | Đổi tài khoản ngân hàng: cần mật khẩu + OTP, tối đa 30 ngày/lần, có email thông báo |

### Admin quản lý shop

| Phương thức | Đường dẫn | Quyền | Chức năng |
|---|---|---|---|
| GET | /admin/shops?status=&q=&page=&limit= | ADMIN | Danh sách shop: lọc trạng thái, tìm theo tên shop / email chủ shop, phân trang |
| GET | /admin/shops/:id | ADMIN | Hồ sơ đầy đủ (mã số thuế, ngân hàng, chủ shop) |
| PATCH | /admin/shops/:id/approve | ADMIN | Duyệt: shop ACTIVE, chủ shop thành SELLER (một transaction) |
| PATCH | /admin/shops/:id/reject | ADMIN | Từ chối, bắt buộc `reason` (5–500 ký tự) |
| PATCH | /admin/shops/:id/lock | ADMIN | Khóa shop đang hoạt động, bắt buộc `reason` |
| PATCH | /admin/shops/:id/unlock | ADMIN | Mở khóa |

Mỗi lần duyệt, từ chối, khóa, mở khóa đều gửi email cho chủ shop. Đổi trạng thái dùng cập nhật có điều kiện: hai admin thao tác cùng lúc thì chỉ một người thành công, người còn lại nhận 422.


