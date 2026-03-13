# 🚀 Hướng dẫn Deploy Production - Warehouse System

## Kiến trúc hệ thống

```
Internet → Nginx (443/80) → Next.js App (3000) → PostgreSQL (5432)
                                                    ↑
                                               Cron Worker
```

| Container | Image | Vai trò |
|---|---|---|
| `warehouse-app` | Custom (Dockerfile) | Next.js + API |
| `warehouse-db` | postgres:16-alpine | Database |
| `warehouse-nginx` | nginx:alpine | Reverse proxy + SSL |
| `warehouse-cron` | alpine:3.19 | Rental monitoring (8AM daily) |
| `warehouse-certbot` | certbot/certbot | SSL auto-renewal |

## Cấu trúc thư mục trên VPS

```
/opt/apps/warehouse-system/
├── docker-compose.yml
├── Dockerfile
├── .env                    # Biến môi trường (KHÔNG push lên Git)
├── .env.example
├── docker/
│   ├── entrypoint.sh       # Auto-migrate + start
│   └── cron-worker.sh      # Cron job script  
├── nginx/
│   └── nginx.conf          # Reverse proxy config
├── scripts/
│   └── backup.sh           # DB backup script
├── backups/                # DB backup files
└── prisma/
    └── schema.prisma
```

---

## PHẦN 1: SETUP VPS LẦN ĐẦU

### 1.1 Cài Docker & Docker Compose

```bash
# Cập nhật system
sudo apt update && sudo apt upgrade -y

# Cài dependencies
sudo apt install -y ca-certificates curl gnupg lsb-release

# Thêm Docker GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Cài Docker Engine + Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Cho user hiện tại dùng docker không cần sudo
sudo usermod -aG docker $USER
newgrp docker

# Verify
docker --version
docker compose version
```

### 1.2 Clone code và Setup thư mục

```bash
# Tạo thư mục chính
sudo mkdir -p /opt/apps/warehouse-system
sudo chown -R $USER:$USER /opt/apps

# Clone code
cd /opt/apps/warehouse-system
git clone https://github.com/YOUR_USERNAME/step-it-warehouse.git .

# Tạo thư mục bổ sung
mkdir -p backups
```

### 1.3 Tạo file .env production

```bash
cp .env.example .env
nano .env
```

Điền giá trị thật:

```env
# Database (đổi password mạnh)
DB_USER=admin
DB_PASSWORD=Str0ng_P@ssw0rd_2026!
DB_NAME=warehouse_db

# NextAuth (domain thật hoặc IP)
NEXTAUTH_URL=http://YOUR_PUBLIC_IP
NEXTAUTH_SECRET=openssl_rand_base64_32_output

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Admin
ADMIN_EMAIL=admin@company.com

# Telegram
TELEGRAM_BOT_TOKEN=your-bot-token
TELEGRAM_CHAT_ID=your-chat-id
```

> **Tạo NEXTAUTH_SECRET:**
> ```bash
> openssl rand -base64 32
> ```

### 1.4 Cấp quyền cho scripts

```bash
chmod +x docker/entrypoint.sh
chmod +x docker/cron-worker.sh
chmod +x scripts/backup.sh
```

---

## PHẦN 2: BUILD & START

### 2.1 Build Docker images

```bash
cd /opt/apps/warehouse-system
docker compose build --no-cache
```

> ⏱️ Lần đầu build khoảng 3-5 phút tùy server.

### 2.2 Start toàn bộ hệ thống

```bash
docker compose up -d
```

### 2.3 Kiểm tra trạng thái

```bash
# Xem status tất cả containers
docker compose ps

# Kết quả mong đợi:
# warehouse-db       running (healthy)
# warehouse-app      running (healthy)
# warehouse-nginx    running
# warehouse-cron     running
# warehouse-certbot  running
```

### 2.4 Kiểm tra logs

```bash
# Logs app (xem Prisma migrate + Next.js start)
docker compose logs -f warehouse-app

# Logs database
docker compose logs -f warehouse-db

# Logs nginx
docker compose logs -f warehouse-nginx

# Logs cron worker
docker compose logs -f warehouse-cron

# Tất cả logs
docker compose logs -f --tail=50
```

### 2.5 Test hệ thống

```bash
# Test từ server
curl -I http://localhost

# Test từ trình duyệt
# Mở: http://YOUR_PUBLIC_IP
```

---

## PHẦN 3: SETUP SSL (KHI CÓ DOMAIN)

### 3.1 Trỏ domain về IP server

Ở nhà cung cấp domain, tạo A Record:
- `your-domain.com` → `YOUR_PUBLIC_IP`
- `www.your-domain.com` → `YOUR_PUBLIC_IP`

### 3.2 Lấy SSL certificate lần đầu

```bash
# Stop nginx tạm
docker compose stop warehouse-nginx

# Lấy certificate
docker run --rm \
  -v warehouse-certbot-data:/var/www/certbot \
  -v warehouse-certbot-certs:/etc/letsencrypt \
  -p 80:80 \
  certbot/certbot certonly \
  --standalone \
  -d your-domain.com \
  --email your-email@gmail.com \
  --agree-tos \
  --no-eff-email
```

### 3.3 Cập nhật Nginx config cho HTTPS

Mở file [nginx/nginx.conf](file:///Users/sanghandsome/Documents/projects/workspace/Kho/step-it-warehouse/nginx/nginx.conf):

```bash
nano nginx/nginx.conf
```

**Thay đổi:**

1. Trong block `server` port 80: **Bỏ comment** dòng `return 301` và **comment** block `location /`
2. **Bỏ comment** toàn bộ block `server` port 443
3. Thay `YOUR_DOMAIN` bằng domain thật

### 3.4 Cập nhật .env

```bash
nano .env
# Đổi NEXTAUTH_URL=https://your-domain.com
```

### 3.5 Restart

```bash
docker compose up -d --force-recreate warehouse-nginx warehouse-app
```

---

## PHẦN 4: SETUP BACKUP DATABASE

### 4.1 Test backup thủ công

```bash
bash /opt/apps/warehouse-system/scripts/backup.sh
```

> Kết quả: File `.sql.gz` trong `/opt/apps/warehouse-system/backups/`

### 4.2 Setup Crontab tự động (2h sáng mỗi ngày)

```bash
crontab -e
```

Thêm dòng:

```
0 2 * * * /opt/apps/warehouse-system/scripts/backup.sh >> /opt/apps/warehouse-system/backups/backup.log 2>&1
```

### 4.3 Kiểm tra backup

```bash
ls -lh /opt/apps/warehouse-system/backups/
```

### 4.4 Restore backup (khi cần)

```bash
# Giải nén
gunzip warehouse_db_20260312_020000.sql.gz

# Restore vào DB
cat warehouse_db_20260312_020000.sql | docker exec -i warehouse-db psql -U admin warehouse_db
```

---

## PHẦN 5: UPDATE CODE (CI/CD MANUAL)

### 5.1 Update bình thường (Minimal downtime ~30s)

```bash
# SSH vào server
ssh -p 9996 user@YOUR_SERVER_IP

# Di chuyển vào thư mục project
cd /opt/apps/warehouse-system

# Pull code mới
git pull origin main

# Tag image cũ để rollback nếu cần
docker tag warehouse-system-warehouse-app:latest warehouse-system-warehouse-app:previous

# Rebuild image mới
docker compose build warehouse-app

# Recreate container (app + cron)
docker compose up -d --force-recreate warehouse-app warehouse-cron

# Kiểm tra logs
docker compose logs -f --tail=30 warehouse-app
```

### 5.2 Kiểm tra sau update

```bash
# Verify containers healthy
docker compose ps

# Test endpoint
curl -I http://localhost

# Kiểm tra Prisma migration đã chạy
docker compose logs warehouse-app | grep -i "migrate"
```

### 5.3 ROLLBACK nếu có lỗi

```bash
# Dừng container lỗi
docker compose stop warehouse-app warehouse-cron

# Đổi tag image về bản cũ
docker tag warehouse-system-warehouse-app:previous warehouse-system-warehouse-app:latest

# Start lại với image cũ
docker compose up -d warehouse-app warehouse-cron

# Verify
docker compose logs -f --tail=30 warehouse-app
```

### 5.4 Rollback code git (nếu cần)

```bash
# Xem commit history
git log --oneline -10

# Rollback về commit cụ thể
git reset --hard COMMIT_HASH

# Rebuild
docker compose build warehouse-app
docker compose up -d --force-recreate warehouse-app warehouse-cron
```

---

## PHẦN 6: COMMANDS THAM KHẢO NHANH

| Mục đích | Command |
|---|---|
| Start tất cả | `docker compose up -d` |
| Stop tất cả | `docker compose down` |
| Rebuild app | `docker compose build warehouse-app` |
| Restart app | `docker compose restart warehouse-app` |
| Logs app | `docker compose logs -f warehouse-app` |
| Logs cron | `docker compose logs -f warehouse-cron` |
| Logs nginx | `docker compose logs -f warehouse-nginx` |
| Logs DB | `docker compose logs -f warehouse-db` |
| Shell vào DB | `docker exec -it warehouse-db psql -U admin warehouse_db` |
| Shell vào App | `docker exec -it warehouse-app sh` |
| Disk usage | `docker system df` |
| Dọn dẹp images | `docker image prune -a` |
| Backup DB | `bash scripts/backup.sh` |
| Xem backups | `ls -lh backups/` |

---

## PHẦN 7: TROUBLESHOOTING

### App không start

```bash
docker compose logs warehouse-app
# Kiểm tra: Prisma migrate lỗi? Database chưa ready?
```

### Database connection refused

```bash
docker compose ps warehouse-db
# Nếu unhealthy:
docker compose restart warehouse-db
# Chờ 30s rồi restart app:
docker compose restart warehouse-app
```

### Nginx 502 Bad Gateway

```bash
# App chưa ready, chờ healthcheck pass
docker compose ps warehouse-app
# Nếu healthy mà vẫn 502: kiểm tra network
docker network inspect warehouse-public
```

### Cron không chạy

```bash
docker compose logs -f warehouse-cron
# Test thủ công:
docker exec -it warehouse-cron sh
wget -qO- http://warehouse-app:3000/api/cron/rental-monitor
```

### Đầy disk

```bash
df -h
docker system prune -a    # Xóa images/containers không dùng
docker volume prune        # Xóa volumes không dùng (CẨN THẬN!)
```
