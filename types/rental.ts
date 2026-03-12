// types/rental.ts

export type AssetStatus = 'IN_STOCK' | 'DEPLOYED' | 'MAINTENANCE' | 'FAULTY' | 'DISPOSED' | 'RENTED' | 'INSTALLED';
export type RentalStatus = 'ACTIVE' | 'EXPIRED' | 'RETURNED' | 'CANCELLED';

export interface Product {
  name: string;
}

export interface Asset {
  id: string;
  serialNumber: string;
  status: AssetStatus;
  product: Product;
}

export interface RentalContract {
  id: string;
  customerName: string;
  startDate: string; // API trả về ISO string
  endDate: string;   // API trả về ISO string
  status: RentalStatus;
  assetId: string;
  asset: Asset;
  daysRemaining?: number;
}