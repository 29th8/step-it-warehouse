// components/rentals/create-rental-button.tsx

"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { classNames } from '@/lib/utils';

export function CreateRentalButton() {
  const router = useRouter();
  
  return (
    <button
      onClick={() => router.push('/rentals/create')}
      className={classNames(
        "inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm",
        "text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      )}
    >
      + Tạo Hợp đồng mới
    </button>
  );
}