"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [requested, setRequested] = useState(false);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (requested && password !== confirmation) { setError("Mật khẩu xác nhận không khớp."); return; }
    setBusy(true);
    try {
      const response = await fetch(requested ? "/api/auth/forgot-password/confirm" : "/api/auth/forgot-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requested ? { email, code, password } : { email }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể xử lý yêu cầu.");
      if (requested) { setDone(true); setPassword(""); setConfirmation(""); setCode(""); } else setRequested(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xử lý yêu cầu.");
    } finally { setBusy(false); }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-[400px] shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center"><Image src="/step-logo.png" alt="STEP IT" width={56} height={56} className="h-14 w-14 rounded-md object-cover" /></div>
          <CardTitle className="text-2xl font-bold">Quên mật khẩu</CardTitle>
        </CardHeader>
        <CardContent>
          {done ? <p role="status" className="text-center text-sm text-green-700">Đã đặt lại mật khẩu. Bạn có thể đăng nhập.</p> : (
            <form onSubmit={submit} className="space-y-4">
              {requested ? <>
                <p className="text-sm text-slate-600">Nếu email đủ điều kiện, mã xác thực sẽ được gửi tới hộp thư của bạn.</p>
                <Input aria-label="Mã xác thực" placeholder="Mã xác thực 6 số" value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" />
                <Input aria-label="Mật khẩu mới" placeholder="Mật khẩu mới" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
                <Input aria-label="Xác nhận mật khẩu" placeholder="Xác nhận mật khẩu" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
              </> : <Input aria-label="Email" placeholder="Email đã xác thực" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={100} autoComplete="email" />}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={busy}>{busy ? "Đang xử lý..." : requested ? "Đặt lại mật khẩu" : "Gửi mã xác thực"}</Button>
              {requested && <Button type="button" variant="outline" className="w-full" onClick={() => { setRequested(false); setCode(""); setError(""); }}>Đổi email hoặc gửi lại mã</Button>}
            </form>
          )}
          <p className="mt-4 text-center text-sm"><Link href="/login" className="font-medium text-blue-700 hover:underline">Quay lại đăng nhập</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
