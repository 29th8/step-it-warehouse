// lib/rack-utils.ts

interface RackAsset {
    id: string;
    rackUnit: number | null;
    uHeight: number;
}

/**
 * Kiểm tra xem vị trí mới có bị trùng với thiết bị cũ không
 */
export function checkRackOverlap(
    targetStart: number,
    targetHeight: number,
    existingAssets: RackAsset[],
    excludeAssetId?: string // Bỏ qua chính nó khi đang Edit
): boolean {

    // Tính khoảng U của thiết bị mới [start, end]
    const targetEnd = targetStart + targetHeight - 1;

    for (const asset of existingAssets) {
        // Bỏ qua asset chưa lên rack hoặc chính là asset đang sửa
        if (!asset.rackUnit || asset.id === excludeAssetId) continue;

        const assetStart = asset.rackUnit;
        const assetEnd = asset.rackUnit + asset.uHeight - 1;

        // Logic va chạm: (StartA <= EndB) và (EndA >= StartB)
        if (targetStart <= assetEnd && targetEnd >= assetStart) {
            return true; // Có va chạm
        }
    }

    return false; // An toàn
}