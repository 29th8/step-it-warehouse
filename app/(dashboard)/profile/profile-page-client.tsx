"use client";

import { FormEvent, useEffect, useState } from "react";
import { KeyRound, LoaderCircle, Save, ShieldCheck, UserRound } from "lucide-react";
import { useSession } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type Profile = {
  username: string;
  name: string;
  verifiedEmail: string | null;
  role: string;
  createdAt: string;
};

export default function ProfilePageClient() {
  const { update: updateSession } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  useEffect(() => {
    fetch("/api/profile", { cache: "no-store" })
      .then(async (response) => {
        const json = await response.json();
        if (!response.ok) throw new Error(json.error || "Không thể tải hồ sơ.");
        const nextProfile = json.data as Profile;
        setProfile(nextProfile);
        setName(nextProfile.name);
      })
      .catch((error: unknown) => toast.error(error instanceof Error ? error.message : "Không thể tải hồ sơ."))
      .finally(() => setLoading(false));
  }, []);

  const saveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Không thể cập nhật hồ sơ.");
      setProfile(json.data as Profile);
      setName(json.data.name);
      await updateSession({ name: json.data.name });
      toast.success("Đã cập nhật hồ sơ.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ.");
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Xác nhận mật khẩu mới chưa khớp.");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch("/api/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error || "Không thể đổi mật khẩu.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success("Đã đổi mật khẩu.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể đổi mật khẩu.");
    } finally {
      setChangingPassword(false);
    }
  };

  const roleLabel = profile?.role === "ADMIN" ? "Quản trị viên" : "Người dùng";

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-3 sm:p-4 md:space-y-6 md:p-8">
      <div className="space-y-1.5">
        <h1 className="flex items-center gap-3 text-2xl font-extrabold tracking-tight text-slate-900 md:text-3xl">
          <span className="rounded-xl border border-blue-200 bg-blue-50 p-2 text-blue-600 shadow-sm"><UserRound className="h-6 w-6" /></span>
          Hồ sơ cá nhân
        </h1>
        <p className="ml-1 font-medium text-slate-500">Quản lý thông tin và bảo mật tài khoản của bạn.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-6">
        <Card className="gap-4 border-slate-200 py-5">
          <CardHeader>
            <CardTitle>Thông tin tài khoản</CardTitle>
            <CardDescription>Tên đăng nhập và quyền được quản trị viên quản lý.</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? <div className="flex justify-center py-12 text-slate-400"><LoaderCircle className="h-6 w-6 animate-spin" /></div> : (
              <form className="space-y-4" onSubmit={saveProfile}>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Họ và tên</label><Input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} disabled={!profile || saving} /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Tên đăng nhập</label><Input value={profile?.username || ""} disabled /></div>
                <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Email đã xác thực</label><Input value={profile?.verifiedEmail || "Chưa xác thực"} disabled /></div>
                <div className="flex items-center gap-2 text-sm text-slate-600"><ShieldCheck className="h-4 w-4 text-blue-600" />Vai trò: <strong>{roleLabel}</strong></div>
                <Button type="submit" disabled={!profile || saving} className="bg-blue-600 text-white hover:bg-blue-700"><Save className="h-4 w-4" />{saving ? "Đang lưu" : "Lưu thay đổi"}</Button>
              </form>
            )}
          </CardContent>
        </Card>

        <Card className="gap-4 border-slate-200 py-5">
          <CardHeader><CardTitle>Đổi mật khẩu</CardTitle><CardDescription>Nhập mật khẩu hiện tại để xác nhận thay đổi.</CardDescription></CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={changePassword}>
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Mật khẩu hiện tại</label><Input type="password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" required /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Mật khẩu mới</label><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></div>
              <div className="space-y-2"><label className="text-sm font-medium text-slate-700">Xác nhận mật khẩu mới</label><Input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" minLength={6} required /></div>
              <Button type="submit" disabled={changingPassword} className="bg-slate-800 text-white hover:bg-slate-900"><KeyRound className="h-4 w-4" />{changingPassword ? "Đang đổi" : "Đổi mật khẩu"}</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
