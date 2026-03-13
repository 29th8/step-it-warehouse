"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ResetPasswordModalProps {
    user: User;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function ResetPasswordModal({ user, isOpen, onClose, onSuccess }: ResetPasswordModalProps) {
    const [loading, setLoading] = useState(false);
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newPassword || !confirmPassword) {
            toast.error("Vui lòng điền mật khẩu mới");
            return;
        }
        if (newPassword.length < 6) {
            toast.error("Mật khẩu phải từ 6 ký tự trở lên");
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error("Mật khẩu xác nhận không khớp");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`/api/users/${user.id}/reset-password`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ newPassword }),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Không thể đặt lại mật khẩu");
            }

            toast.success(`Đã đổi mật khẩu cho tài khoản ${user.username}`);
            onSuccess();
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Đặt lại mật khẩu: {user.username}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="newPassword">Mật khẩu mới</Label>
                        <Input
                            id="newPassword"
                            type="password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Từ 6 ký tự trở lên"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="confirmPassword">Nhập lại mật khẩu</Label>
                        <Input
                            id="confirmPassword"
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Nhập lại mật khẩu mới"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Đang xử lý..." : "Xác nhận đổi"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
