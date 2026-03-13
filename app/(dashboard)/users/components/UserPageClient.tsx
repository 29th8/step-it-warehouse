"use client";

import { useState, useEffect } from "react";
import { User } from "@prisma/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import UserTable from "./UserTable";
import CreateUserModal from "./CreateUserModal";

interface FetchResponse {
    data: User[];
    total: number;
    page: number;
    limit: number;
}

export default function UserPageClient() {
    const [users, setUsers] = useState<User[]>([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(true);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    const fetchUsers = async (pageToFetch: number = page) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/users?page=${pageToFetch}`);
            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.error || "Thất bại khi lấy dữ liệu người dùng");
            }

            const responseJson: FetchResponse = await res.json();
            setUsers(responseJson.data);
            setTotal(responseJson.total);
            setPage(responseJson.page);
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers(page);
    }, [page]);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 shadow rounded-lg mb-4">
                <div>
                    <p className="text-gray-500">Tổng cộng: {total} người dùng</p>
                </div>
                <Button onClick={() => setIsCreateModalOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Thêm mới
                </Button>
            </div>

            <UserTable users={users} loading={loading} onRefresh={() => fetchUsers(page)} />

            {/* Pagination Controls */}
            <div className="flex justify-end items-center gap-4 mt-4 text-sm font-medium">
                <Button
                    variant="outline"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                >
                    Trước
                </Button>
                <p>Trang {page}</p>
                <Button
                    variant="outline"
                    disabled={page * 20 >= total}
                    onClick={() => setPage((prev) => prev + 1)}
                >
                    Sau
                </Button>
            </div>

            {isCreateModalOpen && (
                <CreateUserModal
                    isOpen={isCreateModalOpen}
                    onClose={() => setIsCreateModalOpen(false)}
                    onSuccess={() => {
                        setIsCreateModalOpen(false);
                        fetchUsers(1); // Quay về trang 1 lấy mới nhất
                    }}
                />
            )}
        </div>
    );
}
