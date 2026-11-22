"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AssetActionMenu } from "@/components/inventory/asset-action-menu";

export default function AssetDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="p-4 md:p-8">
      <Link href="/assets" className="text-sm font-medium text-blue-600 hover:underline">Quay lại danh sách thiết bị</Link>
      <AssetActionMenu
        asset={{ id, serialNumber: "" }}
        hideTrigger
        openToken={1}
        onRefresh={() => router.refresh()}
        onDetailClose={() => router.replace("/assets")}
      />
    </div>
  );
}
