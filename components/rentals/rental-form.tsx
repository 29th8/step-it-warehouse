// components/rentals/rental-form.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AssetOption, ApiResponse } from '@/lib/types';
import { toast } from 'sonner';
import { handleApiResponse } from '@/lib/api-handler';
import { Spinner } from '../common/spinner';
import { classNames } from '@/lib/utils';
import { format } from 'date-fns';

export function RentalForm() {
  const router = useRouter();

  const [availableAssets, setAvailableAssets] = useState<AssetOption[]>([]);
  const [formData, setFormData] = useState({
    assetId: '',
    customerName: '',
    startDate: format(new Date(), 'yyyy-MM-dd'), // Format cho input type="date"
    durationMonths: '1', // String để khớp với value của <select>
  });
  const [loadingAssets, setLoadingAssets] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Tải danh sách Asset đang IN_STOCK
    const fetchAssets = async () => {
      setLoadingAssets(true);
      try {
        const res = await fetch('/api/assets'); // API GET assets đã có
        const data: AssetOption[] = await res.json(); // Giả định API trả về mảng trực tiếp
        const rentableAssets = data.filter(a => a.status === 'IN_STOCK');
        setAvailableAssets(rentableAssets);
        if (rentableAssets.length > 0) {
          setFormData(prev => ({ ...prev, assetId: rentableAssets[0].id }));
        }
      } catch (error: any) {
        toast.error(error.message || 'Lỗi khi tải danh sách thiết bị');
      } finally {
        setLoadingAssets(false);
      }
    };
    fetchAssets();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { assetId, customerName, startDate, durationMonths } = formData;

    if (!assetId || !customerName || !startDate || !durationMonths) {
      toast.warning('Vui lòng điền đầy đủ các thông tin bắt buộc.');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await fetch('/api/rentals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assetId,
          customerName,
          startDate: new Date(startDate), // Chuyển lại Date object cho API
          durationMonths: parseInt(durationMonths)
        })
      });

      await handleApiResponse(res, 'Hợp đồng thuê đã được tạo thành công!');
      router.push('/rentals'); // Redirect về trang danh sách
    } catch (error: any) {
      if (error.message !== 'API_ERROR_HANDLED') {
        toast.error(error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-lg border border-slate-200">

      {/* Field: Thiết bị cho thuê */}
      <div className="space-y-2">
        <label htmlFor="assetId" className="block text-sm font-medium text-gray-700">Thiết bị cho thuê *</label>
        {loadingAssets ? (
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Spinner /> Đang tải thiết bị...
          </div>
        ) : availableAssets.length === 0 ? (
          <p className="text-sm text-red-600">Không có thiết bị "IN_STOCK" nào khả dụng.</p>
        ) : (
          <select
            id="assetId"
            name="assetId"
            value={formData.assetId}
            onChange={e => setFormData({ ...formData, assetId: e.target.value })}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            {availableAssets.map(asset => (
              <option key={asset.id} value={asset.id}>
                {asset.serialNumber} - {asset.product.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Field: Tên khách hàng */}
      <div className="space-y-2">
        <label htmlFor="customerName" className="block text-sm font-medium text-gray-700">Tên khách hàng *</label>
        <input
          type="text"
          id="customerName"
          name="customerName"
          value={formData.customerName}
          onChange={e => setFormData({ ...formData, customerName: e.target.value })}
          placeholder="Nhập tên công ty hoặc cá nhân"
          className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Field: Ngày bắt đầu */}
        <div className="space-y-2">
          <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">Ngày bắt đầu *</label>
          <input
            type="date"
            id="startDate"
            name="startDate"
            value={formData.startDate}
            onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>

        {/* Field: Thời hạn thuê (Tháng) */}
        <div className="space-y-2">
          <label htmlFor="durationMonths" className="block text-sm font-medium text-gray-700">Thời hạn (Tháng) *</label>
          <select
            id="durationMonths"
            name="durationMonths"
            value={formData.durationMonths}
            onChange={e => setFormData({ ...formData, durationMonths: e.target.value })}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          >
            <option value="1">1 tháng</option>
            <option value="3">3 tháng</option>
            <option value="6">6 tháng</option>
            <option value="12">12 tháng</option>
            <option value="24">24 tháng</option>
          </select>
        </div>
      </div>

      {/* Nút Submit */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={classNames(
          "w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white",
          "bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500",
          isSubmitting && "opacity-70 cursor-not-allowed"
        )}
      >
        {isSubmitting ? <Spinner size="h-5 w-5 mr-2" color="text-white" /> : null}
        {isSubmitting ? 'Đang tạo hợp đồng...' : 'Tạo Hợp đồng'}
      </button>
    </form>
  );
}