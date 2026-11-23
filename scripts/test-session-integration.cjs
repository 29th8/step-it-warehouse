// Requires the isolated test database and test server described in docs/ai-context/deployment.md.
/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require("node:assert/strict");
const { PrismaClient } = require("@prisma/client");
const { encode, decode } = require("next-auth/jwt");

const databaseUrl = process.env.DATABASE_URL;
const baseUrl = process.env.SESSION_TEST_URL;
const secret = process.env.NEXTAUTH_SECRET;
if (!databaseUrl || new URL(databaseUrl).hostname !== "127.0.0.1" || new URL(databaseUrl).port !== "55439" || new URL(databaseUrl).pathname !== "/session_test" || baseUrl !== "http://localhost:3117" || !secret) {
  throw new Error("Chỉ chạy với database và server thử nghiệm riêng trên cổng 55439/3117.");
}
const prisma = new PrismaClient();
const cookieName = "next-auth.session-token";
const idle = 2 * 60 * 60 * 1000;
const absolute = 12 * 60 * 60 * 1000;

async function run() {
  const user = await prisma.user.findUniqueOrThrow({ where: { username: "session_test" } });
  const createCookie = async (claims) => `${cookieName}=${await encode({ secret, token: { id: user.id, username: user.username, role: "ADMIN", ...claims }, maxAge: 86400 })}`;
  const api = (cookie) => fetch(`${baseUrl}/api/warehouses`, { headers: cookie ? { cookie } : {}, redirect: "manual" });
  const now = Date.now();
  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`);
  assert.equal(csrfResponse.status, 200, "Phải lấy được CSRF token");
  const csrfCookie = csrfResponse.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  const { csrfToken } = await csrfResponse.json();
  const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", cookie: csrfCookie },
    body: new URLSearchParams({ csrfToken, username: "session_test", password: "LocalTestOnly-2026", json: "true" }),
    redirect: "manual",
  });
  const signedInCookie = loginResponse.headers.getSetCookie().map((value) => value.split(";")[0]).find((value) => value.startsWith(`${cookieName}=`));
  assert.ok(signedInCookie, "Đăng nhập phải tạo session cookie");
  assert.equal((await api(signedInCookie)).status, 200, "Cookie từ đăng nhập phải truy cập được API");
  const signedToken = await decode({ secret, token: signedInCookie.slice(cookieName.length + 1) });
  assert.ok(signedToken.loginAt && signedToken.activeAt, "JWT phải chứa các mốc phiên");
  const updateResponse = await fetch(`${baseUrl}/api/auth/session`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `${csrfCookie}; ${signedInCookie}` },
    body: JSON.stringify({ csrfToken, data: { activity: true } }),
  });
  assert.equal(updateResponse.status, 200, "Cập nhật hoạt động phải thành công");
  const updatedCookie = updateResponse.headers.getSetCookie().map((value) => value.split(";")[0]).find((value) => value.startsWith(`${cookieName}=`));
  assert.ok(updatedCookie, "Cập nhật hoạt động phải phát hành cookie");
  const updatedToken = await decode({ secret, token: updatedCookie.slice(cookieName.length + 1) });
  assert.equal(updatedToken.loginAt, signedToken.loginAt, "Hoạt động không được gia hạn mốc đăng nhập");
  assert.ok(updatedToken.activeAt >= signedToken.activeAt, "Hoạt động phải cập nhật mốc hoạt động");
  const valid = await createCookie({ loginAt: now - 60_000, activeAt: now - 1000 });
  assert.equal((await api()).status, 401, "Không có phiên phải bị từ chối");
  assert.equal((await api(valid)).status, 200, "Phiên hợp lệ phải truy cập được");
  assert.equal((await api(await createCookie({ loginAt: now - idle - 1000, activeAt: now - idle - 1000 }))).status, 401, "Phiên nhàn rỗi phải hết hạn");
  assert.equal((await api(await createCookie({ loginAt: now - absolute - 1000, activeAt: now - 1000 }))).status, 401, "Phiên quá 12 giờ phải hết hạn");
  assert.equal((await api(await createCookie({}))).status, 401, "Phiên cũ không có mốc thời gian phải bị từ chối");
  const expiredCookie = await createCookie({ loginAt: now - idle - 1000, activeAt: now - idle - 1000 });
  const expiredSession = await fetch(`${baseUrl}/api/auth/session`, { headers: { cookie: expiredCookie } });
  assert.ok(!(await expiredSession.json()).user, "API session không được trả user khi phiên hết hạn");
  await prisma.user.update({ where: { id: user.id }, data: { role: "USER" } });
  assert.equal((await api(valid)).status, 401, "Phiên role cũ phải bị thu hồi");
  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN", isActive: false } });
  assert.equal((await api(valid)).status, 401, "Tài khoản bị khóa phải bị từ chối");
  await prisma.user.update({ where: { id: user.id }, data: { isActive: true } });
  const loginRedirect = await fetch(`${baseUrl}/assets?search=abc`, { redirect: "manual" });
  assert.equal(loginRedirect.status, 307);
  assert.equal(new URL(loginRedirect.headers.get("location"), baseUrl).searchParams.get("callbackUrl"), "/assets?search=abc");
  console.log("Đạt kiểm tra đăng nhập, API và chuyển hướng với database thử nghiệm.");
}

run().catch((error) => { console.error(error); process.exitCode = 1; }).finally(() => prisma.$disconnect());
