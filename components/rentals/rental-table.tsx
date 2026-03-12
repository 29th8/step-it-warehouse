// components/rentals/rental-table.tsx

"use client";

import React, { useState } from 'react';
import { RentalContract } from '@/lib/types';
import { formatDate, classNames } from '@/lib/utils';
import { RentalStatusBadge } from './rental-status-badge';
import { toast } from 'sonner';
import { handleApiResponse } from '@/lib/api-handler';
import { Spinner } from '../common/spinner';
import { differenceInDays, startOfDay } from 'date-fns';
import { AlertTriangle } from 'lucide-react';

interface RentalTableProps {
  data: RentalContract[];
  onRefresh: () => void;
  loading: boolean;
}

export function RentalTable({ data, onRefresh, loading }: RentalTableProps) {
  const [returningContractId, setReturningContractId] = useState<string | null>(null);

  const handleReturn = async (contractId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xác nhận trả thiết bị này?')) {
      return;
    }

    setReturningContractId(contractId);
    try {
      const res = await fetch('/api/rentals/return', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contractId })
      });

      await handleApiResponse(res, 'Thiết bị đã được trả thành công!');
      onRefresh(); // Refresh danh sách sau khi trả
    } catch (error: any) {
      if (error.message !== 'API_ERROR_HANDLED') {
        toast.error(error.message);
      }
    } finally {
      setReturningContractId(null);
    }
  };

  return (
    <div className="overflow-x-auto bg-white rounded-xl shadow-sm border border-slate-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-slate-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Thiết bị
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Khách hàng
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ngày thuê
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Ngày trả
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Trạng thái
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Remaining
            </th>
            <th scope="col" className="relative px-6 py-3">
              <span className="sr-only">Hành động</span>
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {loading ? (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                <Spinner /> Đang tải hợp đồng...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">
                Chưa có hợp đồng nào.
              </td>
            </tr>
          ) : (
            data.map((contract) => {
              const today = startOfDay(new Date());
              const end = startOfDay(new Date(contract.endDate));
              const daysRemaining = contract.daysRemaining !== undefined
                ? contract.daysRemaining
                : differenceInDays(end, today);

              let badgeColor = "bg-green-500";
              let badgeText = `${daysRemaining} ngày`;
              let showIcon = false;

              if (daysRemaining < 0) {
                badgeColor = "bg-red-900";
                badgeText = "Expired";
              } else if (daysRemaining <= 3) {
                badgeColor = "bg-red-500";
                showIcon = true;
              } else if (daysRemaining <= 7) {
                badgeColor = "bg-yellow-400 text-slate-900";
                showIcon = true;
              }

              return (
                <tr key={contract.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-blue-600">{contract.asset.serialNumber}</div>
                    <div className="text-xs text-gray-500">{contract.asset.product.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{contract.customerName}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(contract.startDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{formatDate(contract.endDate)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <RentalStatusBadge status={contract.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={classNames(
                      "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white",
                      badgeColor
                    )}>
                      {showIcon && <AlertTriangle className="w-3 h-3 mr-1" />}
                      {badgeText}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {contract.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleReturn(contract.id)}
                        disabled={returningContractId === contract.id}
                        className={classNames(
                          "inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm",
                          "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
                          returningContractId === contract.id && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {returningContractId === contract.id ? <Spinner size="h-4 w-4 mr-1" color="text-white" /> : 'Trả thiết bị'}
                      </button>
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}