// lib/types.ts

// Cho Asset trong dropdown
export interface AssetOption {
  id: string;
  serialNumber: string;
  product: {
    name: string;
  };
  status: string; // IN_STOCK
}

// Cho Hợp đồng thuê
export type RentalStatus = 'ACTIVE' | 'EXPIRED' | 'RETURNED' | 'CANCELLED';

export interface RentalContract {
  id: string;
  assetId: string;
  asset: {
    serialNumber: string;
    product: {
      name: string;
    };
  };
  customerName: string;
  startDate: string; // ISO Date string
  endDate: string;   // ISO Date string
  status: RentalStatus;
  createdAt: string;
  updatedAt: string;
  daysRemaining?: number;
}

// Định dạng response API chuẩn
export interface ApiResponse<T> {
  data?: T;
  error?: string;
}