// components/rentals/rental-status-badge.tsx

import React from 'react';
import { classNames } from '@/lib/utils';
import { RentalStatus } from '@/lib/types';

interface RentalStatusBadgeProps {
  status: RentalStatus;
}

export function RentalStatusBadge({ status }: RentalStatusBadgeProps) {
  const badgeClasses = classNames(
    "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
    status === 'ACTIVE' && "bg-blue-100 text-blue-800",
    status === 'EXPIRED' && "bg-red-100 text-red-800",
    status === 'RETURNED' && "bg-green-100 text-green-800",
    status === 'CANCELLED' && "bg-gray-100 text-gray-800"
  );

  return (
    <span className={badgeClasses}>
      {status === 'ACTIVE' && 'Đang hoạt động'}
      {status === 'EXPIRED' && 'Quá hạn'}
      {status === 'RETURNED' && 'Đã trả'}
      {status === 'CANCELLED' && 'Đã hủy'}
    </span>
  );
}