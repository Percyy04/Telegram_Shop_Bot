# 🤖 Telegram Shop Bot (SePay Webhook Auto-Payment & Atomic Delivery)

Hệ thống bán hàng tự động qua Telegram Bot, tự động xác nhận thanh toán chuyển khoản ngân hàng qua **SePay Webhook** và tự động giao hàng mã hóa (tài khoản, key, giftcode, v.v.) không cần Admin duyệt.

---

## 🌟 Tính năng cốt lõi

1. **Auto Confirm Thanh toán (SePay)**:
   - Xác thực chữ ký HMAC-SHA256 & chống phát lại giao dịch (timestamp replay protection).
   - Khớp mã đơn hàng dạng `TG-XXXXXX` (bảng chữ cái chống nhầm lẫn: không chứa `0`, `O`, `1`, `I`, `L`).
   - Kiểm tra **chính xác 100% số tiền** (Exact amount check) trước khi kích hoạt đơn.
   - Webhook phản hồi HTTP 200 tức thì; quy trình giao hàng được tách rời ra worker riêng.

2. **Giao hàng An toàn & Tách biệt Worker (Delivery State Machine)**:
   - Trạng thái giao hàng chuẩn xác: `PENDING` → `SENDING` → `SENT` / `FAILED` / `UNCERTAIN`.
   - Giao hàng bị ngắt kết nối/timeout chuyển sang `UNCERTAIN` — không bao giờ tự động gửi lại để chống giao 2 lần cho khách.
   - Linux Crontab gọi worker `/api/cron/process-pending-deliveries` mỗi phút.

3. **Mã hóa Dữ liệu Hàng hóa (AES-256-GCM)**:
   - Dữ liệu hàng hóa (tài khoản, mật khẩu, key) được mã hóa AES-256-GCM trực tiếp trên Server trước khi lưu Database.
   - Admin chỉ nhập dạng văn bản thô, hệ thống tự mã hóa.
   - Giải mã server-side tức thời ngay khi gửi tin nhắn cho khách.

4. **Bảo mật & Chuẩn Transactional (Supabase RPCs)**:
   - Giữ hàng nguyên tử sử dụng `SELECT ... FOR UPDATE SKIP LOCKED` chống race-condition khi 2 người mua cùng lúc 1 sản phẩm cuối cùng.
   - Tự động nhả hàng khi đơn quá 30 phút chưa thanh toán (`release_expired_orders`).

5. **Admin Dashboard Quản trị**:
   - Giao diện Admin chuyên nghiệp (Next.js 15, Tailwind, Lucide icons).
   - Nhập hàng hàng loạt (Bulk Stock Import) hỗ trợ đến hàng nghìn dòng.
   - Phân biệt rõ đơn tự động `🤖 Auto SePay` và `👤 Thủ công`.
   - Hỗ trợ nút Thử lại giao hàng (Retry Delivery) và Hủy đơn hoàn hàng thủ công.

---

## 🛠 Hướng dẫn Cài đặt & Cấu hình

### 1. Khởi tạo Database (Supabase)
Chạy lần lượt 6 tệp SQL trong thư mục `supabase/migrations/` trên Supabase SQL Editor:
- `001_enums.sql`
- `002_tables.sql`
- `003_indexes.sql`
- `004_rls.sql`
- `005_rpcs.sql`
- `006_triggers.sql`
- (Tùy chọn) `seed.sql` để tạo danh mục và sản phẩm mẫu.

### 2. Cấu hình Biến môi trường (`.env`)
Tạo tệp `.env.local` (local) hoặc `.env` (trên VPS):
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...

# Telegram Bot
TELEGRAM_BOT_TOKEN=123456789:ABCdef...
TELEGRAM_WEBHOOK_SECRET=your_random_telegram_secret_string
ADMIN_TELEGRAM_IDS=12345678,98765432

# Mã hóa AES-256-GCM (32-byte Base64 Key)
INVENTORY_ENCRYPTION_KEY=c29tZV9yYW5kb21fYmFzZTY0X2tleV8zMl9ieXRlc18=

# VietQR
VIETQR_BANK_CODE=970422
VIETQR_ACCOUNT_NUMBER=1234567890
VIETQR_ACCOUNT_NAME=NGUYEN VAN A

# App & Cron
NEXT_PUBLIC_APP_URL=https://shop.example.com
CRON_SECRET=your_secure_cron_bearer_token
ORDER_EXPIRE_MINUTES=30

# SePay
SEPAY_WEBHOOK_SECRET=your_sepay_webhook_secret
SEPAY_EXPECTED_ACCOUNT_NUMBER=1234567890
```

### 3. Tạo tài khoản Admin Dashboard
Chạy lệnh CLI:
```bash
npx tsx scripts/seed-admin.ts admin@example.com MyStrongPassword123 "Quản trị viên"
```

---

## 🚀 Triển khai trên VPS (Ubuntu/Debian)

### 1. Build & Chạy Next.js với PM2
```bash
npm run build
pm2 start npm --name "telegram-shop-bot" -- start
pm2 save
```

### 2. Cấu hình Nginx Reverse Proxy
```nginx
server {
    server_name shop.example.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

### 3. Cài đặt SSL (Certbot Let's Encrypt)
```bash
sudo certbot --nginx -d shop.example.com
```

### 4. Đăng ký Telegram Bot Webhook
Chạy lệnh CLI để thiết lập webhook Telegram có Secret Token:
```bash
npx tsx scripts/set-telegram-webhook.ts https://shop.example.com/api/telegram/webhook
```

### 5. Cấu hình SePay Webhook URL
Đăng nhập SePay Dashboard -> Webhooks:
- **Webhook URL**: `https://shop.example.com/api/webhooks/sepay`
- **Secret Key**: Điền đúng chuỗi `SEPAY_WEBHOOK_SECRET` trong `.env`.

### 6. Cấu hình Linux Crontab (Cron Jobs)
Mở crontab editor (`crontab -e`) và thêm 2 dòng sau:
```cron
# Worker giao hàng tự động qua Telegram (chạy mỗi 1 phút)
* * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://shop.example.com/api/cron/process-pending-deliveries > /dev/null 2>&1

# Hủy đơn hết hạn & giải phóng kho giữ (chạy mỗi 5 phút)
*/5 * * * * curl -s -H "Authorization: Bearer YOUR_CRON_SECRET" https://shop.example.com/api/cron/release-expired-orders > /dev/null 2>&1
```

---

## 🧪 Chạy Kiểm thử (Unit Tests)
Chạy bộ kiểm thử unit test bằng Vitest:
```bash
npx vitest run
```

---

## 📄 Giấy phép
Dự án được xây dựng tuân thủ đầy đủ các tiêu chuẩn bảo mật ngân hàng và quy trình tự động hóa thương mại điện tử qua Telegram.
