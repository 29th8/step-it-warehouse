# CI/CD cho Warehouse System

Luồng triển khai:

```text
git push main
  -> GitHub Actions cai dependency va kiem tra TypeScript
  -> build Docker image
  -> push image ghcr.io/<owner>/<repository>:sha-<commit>
  -> SSH vao VPS
  -> backup PostgreSQL
  -> Prisma migrate deploy
  -> thay container ung dung
  -> kiem tra /api/health
  -> thanh cong hoac rollback ve image truoc
```

Migration duoc chay truoc khi thay container dang hoat dong. Neu migration loi,
ban ung dung cu van tiep tuc chay. Neu ung dung moi khong healthy, pipeline tu
dong khoi dong lai image truoc. Database khong tu dong restore vi thao tac do
co the xoa cac du lieu moi phat sinh; file backup duoc giu trong `backups/` de
restore co kiem soat.

## 1. Tao SSH key cho GitHub Actions

Chay tren may local:

```bash
ssh-keygen -t ed25519 -C "warehouse-github-actions" -f ./warehouse_deploy_key
```

Them noi dung file `warehouse_deploy_key.pub` vao
`~/.ssh/authorized_keys` cua user deploy tren VPS. Khong commit hai file key vao
repository. Sau khi da dua private key vao GitHub Secret, xoa private key khoi
thu muc du an.

User deploy tren VPS can co quyen:

- doc repository tai thu muc ung dung;
- chay `git`, `docker` va `docker compose` khong can nhap password sudo;
- ghi vao thu muc ung dung va thu muc `backups/`.

## 2. Lay host key cua VPS

Chay tren may local va kiem tra fingerprint voi VPS truoc khi luu:

```bash
ssh-keyscan -p <SSH_PORT> <VPS_HOST>
```

Voi port khac 22, ket qua phai co dang `[host]:port`. Toan bo ket qua da xac
minh se la gia tri cua secret `VPS_KNOWN_HOSTS`.

## 3. Tao GitHub Environment va Secrets

Trong repository GitHub, vao `Settings -> Environments -> New environment`,
tao environment ten `production`. Them cac secret sau vao environment nay:

| Secret | Gia tri |
| --- | --- |
| `VPS_HOST` | IP hoac hostname cua VPS kho |
| `VPS_PORT` | Cong SSH |
| `VPS_USER` | User deploy |
| `VPS_SSH_KEY` | Toan bo private key, gom ca BEGIN/END |
| `VPS_KNOWN_HOSTS` | Ket qua `ssh-keyscan` da xac minh |
| `VPS_APP_PATH` | Thu muc du an tren VPS, vi du `/opt/apps/warehouse-system` |

Khong can tao token GHCR rieng. Workflow dung `GITHUB_TOKEN` ngan han de push
va pull image, sau do logout GHCR tren VPS.

## 4. Chuan bi VPS mot lan

Thu muc `VPS_APP_PATH` phai la Git repository va co file `.env` production.
Neu repository private, VPS can co deploy key chi co quyen read de lenh
`git fetch` hoat dong.

Kiem tra truoc:

```bash
cd /opt/apps/warehouse-system
git fetch origin main
docker compose version
docker ps
```

File `.env` production phai co it nhat bien database, NextAuth va cac bien dich
vu dang su dung. AI Hermes can cac bien:

```env
HERMES_API_URL=https://your-hermes-host
HERMES_API_TOKEN=your-secret-token
HERMES_TIMEOUT_MS=8000
```

## 5. Kich hoat

Commit va push cac file CI/CD len `main`. Tab `Actions` se chay workflow
`CI and deploy production`. Pull request chi build va kiem tra, khong deploy.
Push vao `main` hoac bam `Run workflow` se build image va deploy.

Trang thai can dat:

- job `Verify, build and publish image`: xanh;
- job `Deploy to VPS`: xanh;
- `docker inspect warehouse-app` bao health `healthy`;
- `curl -fsS https://<domain>/api/health` tra ve `{"status":"ok"}`.

## 6. Rollback thu cong

Pipeline luu image gan nhat tai `.deploy/current-image` va image truoc tai
`.deploy/previous-image`. Khi can rollback thu cong:

```bash
cd /opt/apps/warehouse-system
bash scripts/deploy-vps.sh "$(cat .deploy/previous-image)"
```

Lenh nay van backup va chay `prisma migrate deploy`. No khong ha migration da
ap dung. Neu migration moi khong tuong thich nguoc, can danh gia schema va file
backup truoc khi restore database.
