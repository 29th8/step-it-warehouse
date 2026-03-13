"use client";

import { useState } from "react";
import { User } from "@prisma/client";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Edit, Ban, KeyRound, Trash, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import EditUserModal from "./EditUserModal";
import ResetPasswordModal from "./ResetPasswordModal";
import { format } from "date-fns";
import { vi } from "date-fns/locale";

interface UserTableProps {
    users: User[];
    loading: boolean;
    onRefresh: () => void;
}

export default function UserTable({ users, loading, onRefresh }: UserTableProps) {
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [resettingUser, setResettingUser] = useState<User | null>(null);

    const toggleUserStatus = async (user: User) => {
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isActive: !user.isActive }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Có lỗi xảy ra");
            }
            toast.success(
                user.isActive ? "Đã vô hiệu hoá tài khoản" : "Đã kích hoạt tài khoản"
            );
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const deleteUser = async (user: User) => {
        if (!confirm(`Bạn có chắc muốn xóa tài khoản ${user.username}?`)) return;
        try {
            const res = await fetch(`/api/users/${user.id}`, {
                method: "DELETE",
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error || "Không thể xóa người dùng");
            }
            toast.success("Đã xóa tài khoản thành công");
            onRefresh();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    return (
        <>
            <div className="rounded-md border bg-white">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tài khoản</TableHead>
                            <TableHead>Tên hiển thị</TableHead>
                            <TableHead>Quyền</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead>Ngày tạo</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Đang tải...
                                </TableCell>
                            </TableRow>
                        ) : users.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="h-24 text-center">
                                    Không có dữ liệu
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => (
                                <TableRow key={user.id}>
                                    <TableCell className="font-medium">{user.username}</TableCell>
                                    <TableCell>{user.name}</TableCell>
                                    <TableCell>
                                        <Badge variant={user.role === "ADMIN" ? "default" : "secondary"}>
                                            {user.role}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {user.isActive ? (
                                            <Badge className="bg-green-500 hover:bg-green-600">Hoạt động</Badge>
                                        ) : (
                                            <Badge variant="destructive">Không hoạt động</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {format(new Date(user.createdAt), "dd/MM/yyyy HH:mm", { locale: vi })}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                    <MoreHorizontal className="h-4 w-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={() => setEditingUser(user)}>
                                                    <Edit className="mr-2 h-4 w-4" />
                                                    Sửa
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => toggleUserStatus(user)}>
                                                    {user.isActive ? (
                                                        <><Ban className="text-red-500 mr-2 h-4 w-4" /> <span className="text-red-500">Vô hiệu hoá</span></>
                                                    ) : (
                                                        <><CheckCircle className="text-green-500 mr-2 h-4 w-4" /> <span className="text-green-500">Kích hoạt lại</span></>
                                                    )}
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => setResettingUser(user)}>
                                                    <KeyRound className="mr-2 h-4 w-4 text-blue-500" />
                                                    <span className="text-blue-500">Đặt lại mật khẩu</span>
                                                </DropdownMenuItem>

                                                <DropdownMenuItem onClick={() => deleteUser(user)} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                                                    <Trash className="mr-2 h-4 w-4" />
                                                    Xóa
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            {editingUser && (
                <EditUserModal
                    user={editingUser}
                    isOpen={!!editingUser}
                    onClose={() => setEditingUser(null)}
                    onSuccess={() => {
                        setEditingUser(null);
                        onRefresh();
                    }}
                />
            )}

            {resettingUser && (
                <ResetPasswordModal
                    user={resettingUser}
                    isOpen={!!resettingUser}
                    onClose={() => setResettingUser(null)}
                    onSuccess={() => {
                        setResettingUser(null);
                    }}
                />
            )}
        </>
    );
}
