"use client";

import Link from "next/link";
import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (!codeSent && password !== confirmation) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(codeSent ? "/api/auth/register/verify" : "/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(codeSent ? { email, code } : { name, email, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Không thể đăng ký tài khoản.");
      if (codeSent) {
        setPassword("");
        setConfirmation("");
        setSuccess(true);
      } else {
        setCodeSent(true);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể đăng ký tài khoản.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-[400px] shadow-xl">
        <CardHeader className="text-center">
          <div className="mb-2 flex justify-center"><Image src="/step-logo.png" alt="STEP IT" width={56} height={56} className="h-14 w-14 rounded-md object-cover" /></div>
          <CardTitle className="text-2xl font-bold">Đăng ký tài khoản</CardTitle>
        </CardHeader>
        <CardContent>
          {success ? (
            <p role="status" className="text-center text-sm text-green-700">Xác thực thành công. Bạn có thể đăng nhập bằng email và mật khẩu.</p>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {codeSent ? (
                <>
                  <p className="text-sm text-slate-600">Mã xác thực đã được gửi tới {email}.</p>
                  <Input aria-label="Mã xác thực" placeholder="Mã xác thực 6 số" value={code} onChange={(event) => setCode(event.target.value)} required inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" />
                </>
              ) : (
                <>
                  <Input aria-label="Họ tên" placeholder="Họ tên" value={name} onChange={(event) => setName(event.target.value)} required maxLength={100} />
                  <Input aria-label="Email" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={100} autoComplete="email" />
                  <Input aria-label="Mật khẩu" placeholder="Mật khẩu" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} autoComplete="new-password" />
                  <Input aria-label="Xác nhận mật khẩu" placeholder="Xác nhận mật khẩu" type="password" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required autoComplete="new-password" />
                </>
              )}
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <Button className="w-full bg-blue-600 hover:bg-blue-700" type="submit" disabled={saving}>{saving ? "Đang xử lý..." : codeSent ? "Xác thực" : "Đăng ký"}</Button>
              {codeSent && <Button type="button" variant="outline" className="w-full" onClick={() => { setCodeSent(false); setCode(""); setError(""); }}>Thay đổi thông tin hoặc gửi lại mã</Button>}
            </form>
          )}
          <p className="mt-4 text-center text-sm"><Link href="/login" className="font-medium text-blue-700 hover:underline">Quay lại đăng nhập</Link></p>
        </CardContent>
      </Card>
    </div>
  );
}
