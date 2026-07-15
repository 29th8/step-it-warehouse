const STATUS_LABELS: Record<string, string> = {
  IN_STOCK: "Trong kho",
  RESERVED: "Đã giữ",
  DEPLOYED: "Đang sử dụng",
  HANDED_OVER: "Đã bàn giao",
  MAINTENANCE: "Đang bảo trì",
  FAULTY: "Lỗi/Hỏng",
  DISPOSED: "Thanh lý",
  RENTED: "Đang cho thuê",
  INSTALLED: "Đã lắp ráp",
};

const LOCKED_COMPONENT_STATUSES = new Set(["RENTED", "DEPLOYED", "HANDED_OVER"]);

type ManualStatusAsset = {
  status?: string | null;
  serialNumber?: string | null;
  parentId?: string | null;
  parent?: { status?: string | null; serialNumber?: string | null } | null;
  rentalContracts?: { id: string }[];
  product?: {
    productCategory?: { isMain?: boolean | null } | null;
  } | null;
};

function statusLabel(status?: string | null) {
  if (!status) return "Không xác định";
  return STATUS_LABELS[status] || status;
}

export function getManualStatusChangeError(asset: ManualStatusAsset, nextStatus?: string | null) {
  if (!nextStatus || nextStatus === asset.status) return null;

  const serialText = asset.serialNumber ? ` [SN: ${asset.serialNumber}]` : "";
  const hasActiveRental = (asset.rentalContracts || []).length > 0;
  if (hasActiveRental) {
    return `Thiết bị/linh kiện${serialText} đang có hợp đồng thuê active. Không thể đổi trạng thái thủ công, hãy kết thúc/trả hợp đồng thuê trước.`;
  }

  if (asset.parentId && asset.parent?.status && asset.parent.status !== "IN_STOCK") {
    return `Linh kiện${serialText} đang gắn trong server cha trạng thái ${statusLabel(asset.parent.status)}. Không thể đổi trạng thái thủ công khi server cha không ở Trong kho.`;
  }

  const isComponent = asset.product?.productCategory?.isMain === false;
  if (isComponent && LOCKED_COMPONENT_STATUSES.has(asset.status || "")) {
    return `Linh kiện${serialText} đang ở trạng thái ${statusLabel(asset.status)}, không nằm trong kho nên không thể đổi trạng thái thủ công.`;
  }

  return null;
}
