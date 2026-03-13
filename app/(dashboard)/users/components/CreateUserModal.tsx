"use client";

import { useState } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Role } from "@prisma/client";

interface CreateUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        username: "",
        name: "",
        password: "",
        role: "USER" as Role,
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.username || !formData.name || !formData.password) {
            toast.error("Vui lòng điền đầy đủ thông tin");
            return;
        }
        if (formData.password.length < 6) {
            toast.error("Mật khẩu phải từ 6 ký tự trở lên");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch("/api/users", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Không thể tạo tài khoản");
            }

            toast.success(`Đã tạo tài khoản ${formData.username} thành công`);
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
                    <DialogTitle>Thêm tài khoản mới</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="username">Tên đăng nhập</Label>
                        <Input
                            id="username"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            placeholder="VD: nguyenvan_a"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="name">Tên hiển thị</Label>
                        <Input
                            id="name"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            placeholder="Nguyễn Văn A"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Mật khẩu</Label>
                        <Input
                            id="password"
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            placeholder="Từ 6 ký tự trở lên"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="role">Phân quyền</Label>
                        <Select
                            value={formData.role}
                            onValueChange={(val) => setFormData({ ...formData, role: val as Role })}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn quyền" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="USER">User (Người dùng)</SelectItem>
                                <SelectItem value="ADMIN">Admin (Quản trị viên)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                            Hủy
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Đang xử lý..." : "Lưu"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
