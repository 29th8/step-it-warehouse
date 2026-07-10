type AssetNode = {
  id: string;
  serialNumber: string;
  status: string;
  parentId?: string | null;
  warehouseId?: string | null;
  rackId?: string | null;
  rackUnit?: number | null;
  previousStatus?: string | null;
  previousParentId?: string | null;
  previousWarehouseId?: string | null;
  previousRackId?: string | null;
  previousRackUnit?: number | null;
  deletedAt?: Date | null;
};

const TREE_SELECT = {
  id: true,
  serialNumber: true,
  status: true,
  parentId: true,
  warehouseId: true,
  rackId: true,
  rackUnit: true,
  previousStatus: true,
  previousParentId: true,
  previousWarehouseId: true,
  previousRackId: true,
  previousRackUnit: true,
  deletedAt: true,
} as const;

export async function collectAssetTree(client: any, rootId: string) {
  const root = await client.asset.findUnique({
    where: { id: rootId },
    select: TREE_SELECT,
  }) as AssetNode | null;

  if (!root) return [];

  const nodes: AssetNode[] = [root];
  const queue = [root.id];

  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    const children = await client.asset.findMany({
      where: { parentId: { in: batch } },
      select: TREE_SELECT,
    }) as AssetNode[];

    for (const child of children) {
      nodes.push(child);
      queue.push(child.id);
    }
  }

  return nodes;
}

export async function findTopDeletedAncestor(client: any, assetId: string) {
  let current = await client.asset.findUnique({
    where: { id: assetId },
    select: TREE_SELECT,
  }) as AssetNode | null;

  if (!current) return null;

  while (current.parentId) {
    const parent = await client.asset.findUnique({
      where: { id: current.parentId },
      select: TREE_SELECT,
    }) as AssetNode | null;

    if (!parent || !parent.deletedAt) break;
    current = parent;
  }

  return current;
}

export async function collectDeletedTreeFromAsset(client: any, assetId: string) {
  const root = await findTopDeletedAncestor(client, assetId);
  if (!root || !root.deletedAt) return [];

  const nodes: AssetNode[] = [root];
  const queue = [root.id];

  while (queue.length > 0) {
    const batch = queue.splice(0, queue.length);
    const children = await client.asset.findMany({
      where: { parentId: { in: batch }, deletedAt: { not: null } },
      select: TREE_SELECT,
    }) as AssetNode[];

    for (const child of children) {
      nodes.push(child);
      queue.push(child.id);
    }
  }

  return nodes;
}

export function resolveRestoredStatus(node: AssetNode, restoredParentId?: string | null) {
  const previousStatus = node.previousStatus;

  if (
    restoredParentId &&
    (!previousStatus || previousStatus === "IN_STOCK" || previousStatus === "DISPOSED")
  ) {
    return "INSTALLED";
  }

  return previousStatus || "IN_STOCK";
}

export type { AssetNode };
