import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
// Giả định bạn đã tạo file này theo gợi ý của AI trước đó
import { checkRackOverlap } from "@/lib/rack-utils";
import { collectAssetTree, resolveRestoredStatus } from "@/lib/asset-tree";
import { getProductRackUnitHeight } from "@/lib/product-u-height";
import { componentSlotType, getSlotNames } from "@/lib/server-slots";
import { getManualStatusChangeError } from "@/lib/asset-status-rules";

type Props = { params: Promise<{ id: string }> };

function serializeAsset(asset: any): any {
  if (!asset) return asset;
  const product = asset.product
    ? {
      ...asset.product,
      category: asset.product.productCategory?.code || "",
      categoryName: asset.product.productCategory?.name || asset.product.productCategory?.code || "",
    }
    : asset.product;

  return {
    ...asset,
    product,
    parent: asset.parent ? serializeAsset(asset.parent) : asset.parent,
    components: Array.isArray(asset.components) ? asset.components.map(serializeAsset) : asset.components,
  };
}

// ============================================================================
// 1. GET: LẤY CHI TIẾT KÈM LỊCH SỬ
// ============================================================================
export async function GET(req: Request, props: Props) {
  try {
    const resolvedParams = await props.params;
    const assetId = resolvedParams.id;

    const asset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        product: { include: { productCategory: true } },
        warehouse: true,
        rack: true,
        parent: { include: { product: { include: { productCategory: true } } } },
        components: { include: { product: { include: { productCategory: true } } } },
        rentalContracts: { orderBy: { createdAt: "desc" } },
        movements: {
          orderBy: { createdAt: "desc" },
          include: { user: true }
        }
      }
    });

    if (!asset) {
      return NextResponse.json({ error: "Không tìm thấy thiết bị" }, { status: 404 });
    }

    return NextResponse.json(serializeAsset(asset));
  } catch (error) {
    console.error("GET Asset Detail Error:", error);
    return NextResponse.json({ error: "Lỗi tải dữ liệu" }, { status: 500 });
  }
}

// ============================================================================
// 2. PATCH: CẬP NHẬT THÔNG TIN THIẾT BỊ (ĐÃ BỔ SUNG LOGIC AI)
// ============================================================================
export async function PATCH(req: Request, props: Props) {
  try {
    // A. BẢO MẬT & LẤY USER ID
    const session = await getServerSession(authOptions);
    const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

    if (!sessionIdentifier) {
      return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập!" }, { status: 401 });
    }

    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
    });

    if (!currentUser) return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    const userId = currentUser.id;

    // B. GIẢI NÉN PARAMS & BODY
    const resolvedParams = await props.params;
    const assetId = resolvedParams.id;
    const data = await req.json();

    const existingAsset = await prisma.asset.findUnique({
      where: { id: assetId },
      include: {
        rentalContracts: { where: { status: "ACTIVE" }, select: { id: true } },
        parent: { select: { id: true, status: true, serialNumber: true } },
        product: { include: { productCategory: true } },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });
    }

    const hasActiveRental = existingAsset.rentalContracts.length > 0;
    const parentIsLocked = Boolean(existingAsset.parent && existingAsset.parent.status !== "IN_STOCK");
    const targetProduct = data.productId && data.productId !== existingAsset.productId
      ? await prisma.product.findUnique({
        where: { id: data.productId },
        include: { productCategory: true },
      })
      : existingAsset.product;
    if (!targetProduct) {
      return NextResponse.json({ error: "Sản phẩm không hợp lệ." }, { status: 400 });
    }
    const normalizedRackId = data.rackId && data.rackId !== "none" ? data.rackId : null;
    const productChanged = Boolean(data.productId && data.productId !== existingAsset.productId);
    const targetUHeight = getProductRackUnitHeight(targetProduct, productChanged ? 1 : existingAsset.uHeight || 1);
    const targetProductIsMain = targetProduct?.productCategory?.isMain === true;
    const submittedRackUnit = data.rackUnit !== undefined && data.rackUnit !== null && data.rackUnit !== ""
      ? parseInt(data.rackUnit)
      : null;

    if (submittedRackUnit !== null && (!Number.isInteger(submittedRackUnit) || submittedRackUnit < 1)) {
      return NextResponse.json({
        error: "Vị trí U phải là số nguyên lớn hơn hoặc bằng 1."
      }, { status: 400 });
    }

    const targetHasParent = data.parentId && data.parentId !== "none";
    const keepsExistingParent = data.parentId === undefined && existingAsset.parentId;

    if (targetProductIsMain && (targetHasParent || keepsExistingParent)) {
      return NextResponse.json(
        { error: "Thiết bị chính như server/switch/router không thể lắp vào thiết bị cha. Chỉ linh kiện mới được gắn vào server." },
        { status: 400 }
      );
    }

    let targetParentAsset: any = null;
    if (targetHasParent && data.parentId !== existingAsset.parentId) {
      targetParentAsset = await prisma.asset.findUnique({
        where: { id: data.parentId },
        include: {
          product: { include: { productCategory: true } },
          components: { select: { id: true, installSlotType: true, installSlotName: true } },
        },
      });
      if (!targetParentAsset) {
        return NextResponse.json({ error: "Không tìm thấy thiết bị cha." }, { status: 404 });
      }
      if (targetParentAsset.status !== "IN_STOCK") {
        return NextResponse.json(
          { error: "Chỉ được lắp linh kiện vào server đang ở trạng thái Trong kho." },
          { status: 400 }
        );
      }
    }

    if (targetHasParent && data.parentId === existingAsset.parentId) {
      targetParentAsset = await prisma.asset.findUnique({
        where: { id: data.parentId },
        include: {
          product: { include: { productCategory: true } },
          components: { select: { id: true, installSlotType: true, installSlotName: true } },
        },
      });
    }

    if ((data.parentId === null || data.parentId === "none") && existingAsset.parentId && existingAsset.parent?.status !== "IN_STOCK") {
      return NextResponse.json(
        { error: "Chỉ được tháo linh kiện khi server cha đang ở trạng thái Trong kho. Vui lòng đổi trạng thái server trước." },
        { status: 400 }
      );
    }

    const requiredSlotType = componentSlotType({ product: { category: targetProduct.productCategory?.code, attributes: targetProduct.attributes } });
    if (targetHasParent && targetParentAsset && requiredSlotType) {
      const installSlotType = data.installSlotType === "BAY" ? "DRIVE_BAY" : data.installSlotType;
      const installSlotName = data.installSlotName ? String(data.installSlotName).trim() : "";
      if (installSlotType !== requiredSlotType || !installSlotName) {
        return NextResponse.json(
          { error: `${targetProduct.productCategory?.code === "MEMORY" ? "RAM" : "Ổ cứng"} bắt buộc chọn ${requiredSlotType === "DIMM" ? "DIMM slot" : "Bay ổ cứng"} khi lắp vào server.` },
          { status: 400 }
        );
      }

      const validSlots = getSlotNames(targetParentAsset.product, requiredSlotType);
      if (!validSlots.includes(installSlotName)) {
        return NextResponse.json({ error: `${installSlotName} không tồn tại trên server cha.` }, { status: 400 });
      }

      const slotInUse = targetParentAsset.components.some((component: any) =>
        component.id !== assetId &&
        component.installSlotType === requiredSlotType &&
        component.installSlotName === installSlotName
      );
      if (slotInUse) {
        return NextResponse.json({ error: `${installSlotName} đã được sử dụng trên server cha.` }, { status: 409 });
      }
    }

    // 1️⃣ FIELD-LEVEL ENTERPRISE PROTECTION
    const forbiddenFields: string[] = [];

    // Rule a: Chỉ block khi có hợp đồng thuê đang active (không block linh kiện đơn chỉ mang status RENTED)
    if (hasActiveRental) {
      forbiddenFields.push("warehouseId", "rackId", "rackUnit", "productId", "serialNumber", "status");
    }

    // Rule b: DEPLOYED ASSETS (Cannot change SN)
    if (existingAsset.status === "DEPLOYED") {
      if (!forbiddenFields.includes("serialNumber")) forbiddenFields.push("serialNumber");
    }

    // Rule c: COMPONENT ASSETS (Must follow parent location)
    if (existingAsset.parentId) {
      if (!forbiddenFields.includes("warehouseId")) forbiddenFields.push("warehouseId");
      if (!forbiddenFields.includes("rackId")) forbiddenFields.push("rackId");
      if (!forbiddenFields.includes("rackUnit")) forbiddenFields.push("rackUnit");
    }

    // Rule d: Linh kiện thuộc server không ở trong kho → không được đổi trạng thái
    if (parentIsLocked) {
      if (!forbiddenFields.includes("status")) forbiddenFields.push("status");
    }

    // Execute Field-Level Validation
    const violationLabels: Record<string, string> = {
      warehouseId: "Kho hàng",
      rackId: "Tủ Rack",
      rackUnit: "Vị trí U",
      productId: "Mẫu sản phẩm",
      serialNumber: "Số Serial",
      status: "Trạng thái",
    };

    const violatedFields: string[] = [];

    for (const field of forbiddenFields) {
      // For rackUnit, convert to Number to avoid String vs Number mismatch
      let newDataValue = data[field];
      let existingValue = existingAsset[field as keyof typeof existingAsset];

      if (field === 'rackUnit') {
        if (newDataValue !== undefined && newDataValue !== null) newDataValue = Number(newDataValue);
        if (existingValue !== undefined && existingValue !== null) existingValue = Number(existingValue);
      }
      if (field === 'rackId') {
        if (newDataValue === "none") newDataValue = null;
      }

      if (data[field] !== undefined && newDataValue !== existingValue) {
        violatedFields.push(violationLabels[field] || field);
      }
    }

    if (violatedFields.length > 0) {
      let reason = "Chỉ được phép cập nhật thông tin vận hành (Ghi chú, v.v).";
      if (hasActiveRental) reason = "Thiết bị đang có hợp đồng thuê active. Hãy kết thúc hợp đồng trước.";
      if (parentIsLocked && violatedFields.includes("Trạng thái")) reason = "Linh kiện đang gắn vào server không ở trạng thái Trong kho. Không thể thay đổi trạng thái.";
      return NextResponse.json({
        error: `Không thể thay đổi: ${violatedFields.join(", ")}. ${reason}`
      }, { status: 400 });
    }

    // ------------------------------------------------------------------------
    // MỚI: BẢO MẬT & VALIDATION ASSET LIFECYCLE (ENTERPRISE LOGIC)
    // ------------------------------------------------------------------------
    if (data.status && data.status !== existingAsset.status) {
      if (existingAsset.status === "DISPOSED") {
        const tree = await collectAssetTree(prisma, assetId);
        if (tree.length === 0) {
          return NextResponse.json({ error: "Không tìm thấy cây thiết bị để khôi phục." }, { status: 404 });
        }

        const restoredRootStatus = data.status || existingAsset.previousStatus || "IN_STOCK";
        await prisma.$transaction(async (tx) => {
          for (const node of tree) {
            const restoredParentId = node.previousParentId ?? node.parentId ?? null;

            await tx.asset.update({
              where: { id: node.id },
              data: {
                status: node.id === assetId ? restoredRootStatus as any : resolveRestoredStatus(node, restoredParentId) as any,
                deletedAt: null,
                deletedById: null,
                parentId: restoredParentId,
                warehouseId: node.previousWarehouseId ?? node.warehouseId ?? undefined,
                rackId: node.previousRackId ?? node.rackId ?? null,
                rackUnit: node.previousRackUnit ?? node.rackUnit ?? null,
                previousStatus: null,
                previousParentId: null,
                previousWarehouseId: null,
                previousRackId: null,
                previousRackUnit: null,
              },
            });

            await tx.stockMovement.create({
              data: {
                type: "RESTORE",
                note: node.id === assetId
                  ? `Khôi phục thiết bị ${node.serialNumber} từ trạng thái thanh lý.`
                  : `Khôi phục theo thiết bị cha ${existingAsset.serialNumber}.`,
                asset: { connect: { id: node.id } },
                user: { connect: { id: userId } }
              },
            });
          }
        });

        return NextResponse.json({ message: "Đã khôi phục thiết bị và linh kiện con." });
      }

      const manualStatusError = getManualStatusChangeError(existingAsset, data.status);
      if (manualStatusError) {
        return NextResponse.json({ error: manualStatusError }, { status: 400 });
      }

      const allowedTransitions: Record<string, string[]> = {
        "IN_STOCK": ["RESERVED", "DEPLOYED", "INSTALLED", "RENTED", "FAULTY", "MAINTENANCE", "DISPOSED"],
        "RESERVED": ["DEPLOYED", "IN_STOCK"],
        "DEPLOYED": ["MAINTENANCE", "FAULTY", "IN_STOCK", "INSTALLED", "DISPOSED"],
        "INSTALLED": ["IN_STOCK", "MAINTENANCE", "FAULTY", "DISPOSED"],
        "MAINTENANCE": ["IN_STOCK", "FAULTY", "DISPOSED"],
        "RENTED": ["IN_STOCK", "FAULTY"], // RENTED is largely managed by Rental controller
        "FAULTY": ["MAINTENANCE", "DISPOSED"],
        "DISPOSED": [] // Cannot resurrect disposed assets
      };

      const validTargets = allowedTransitions[existingAsset.status] || [];
      if (!validTargets.includes(data.status)) {
        return NextResponse.json({
          error: `Luồng nghiệp vụ không hợp lệ. Không thể chuyển trạng thái từ [${existingAsset.status}] sang [${data.status}].`
        }, { status: 400 });
      }
    }
    // ------------------------------------------------------------------------

    if (data.status === "DISPOSED" && existingAsset.status !== "DISPOSED") {
      const tree = await collectAssetTree(prisma, assetId);
      if (tree.length === 0) {
        return NextResponse.json({ error: "Không tìm thấy cây thiết bị để thanh lý." }, { status: 404 });
      }

      await prisma.$transaction(async (tx) => {
        for (const node of tree) {
          await tx.asset.update({
            where: { id: node.id },
            data: {
              status: "DISPOSED",
              deletedAt: null,
              deletedById: null,
              previousStatus: node.status as any,
              previousParentId: node.parentId || null,
              previousWarehouseId: node.warehouseId || null,
              previousRackId: node.rackId || null,
              previousRackUnit: node.rackUnit ?? null,
            },
          });

          await tx.stockMovement.create({
            data: {
              type: "TRANSFER",
              note: node.id === assetId
                ? `Thanh lý thiết bị ${node.serialNumber}.`
                : `Thanh lý theo thiết bị cha ${existingAsset.serialNumber}.`,
              asset: { connect: { id: node.id } },
              user: { connect: { id: userId } }
            },
          });
        }
      });

      return NextResponse.json({ message: "Đã thanh lý thiết bị và toàn bộ linh kiện con." });
    }

    const locationChanged =
      existingAsset.rackId !== normalizedRackId ||
      existingAsset.rackUnit !== (targetProductIsMain ? submittedRackUnit : null) ||
      existingAsset.uHeight !== targetUHeight;

    // MỚI: LOGIC VALIDATE TRÙNG LẶP VÀ CHIỀU CAO RACK (CHỈ DATACENTER)
    // ------------------------------------------------------------------------
    if (targetProductIsMain && normalizedRackId && submittedRackUnit && locationChanged) {
      const rack = await prisma.rack.findUnique({
        where: { id: normalizedRackId },
        include: {
          assets: { select: { id: true, rackUnit: true, uHeight: true } }
        }
      });

      if (!rack) return NextResponse.json({ error: "Rack không tồn tại" }, { status: 404 });

      // Chỉ validate cho Rack DATACENTER
      if (rack.type === "DATACENTER" && rack.totalUnits) {
        const newHeight = targetUHeight;
        const newUnit = submittedRackUnit;

        if (newUnit + newHeight - 1 > rack.totalUnits) {
          return NextResponse.json({
            error: `Vị trí vượt quá giới hạn tủ rack (${rack.totalUnits}U).`
          }, { status: 400 });
        }

        const isOverlap = checkRackOverlap(
          newUnit,
          newHeight,
          rack.assets,
          assetId
        );

        if (isOverlap) {
          return NextResponse.json({
            error: "Vị trí U này đang bị chiếm bởi thiết bị khác"
          }, { status: 409 });
        }
      }
    }
    // ------------------------------------------------------------------------

    // C. TẠO NOTE GHI CHÚ
    const warehouse = await prisma.warehouse.findUnique({ where: { id: data.warehouseId } });
    let rackName = "Không lên tủ";
    if (normalizedRackId) {
      const rack = await prisma.rack.findUnique({ where: { id: normalizedRackId } });
      if (rack) rackName = rack.name;
    }

    const uText = ` (Cỡ: ${targetUHeight}U)`;
    const rackUnitText = targetProductIsMain && submittedRackUnit ? ` - Vị trí U: ${submittedRackUnit}${uText}` : "";
    const locationNote = `Cập nhật vị trí: ${warehouse?.name || "N/A"} - Tủ: ${rackName}${rackUnitText}. Trạng thái: ${data.status}. Ghi chú: ${data.notes || "Không"}`;

    // D. CHUẨN BỊ DATA UPDATE
    const updateData: any = {
      serialNumber: data.serialNumber,
      status: data.status,
      notes: data.notes,
      owner: data.owner !== undefined ? (data.owner || null) : undefined,
      uHeight: targetUHeight,
      rackUnit: targetProductIsMain ? submittedRackUnit : null,
    };

    const attachesToParent = data.parentId && data.parentId !== "none";
    const parentChanged = attachesToParent && data.parentId !== existingAsset.parentId;
    if (attachesToParent) {
      if (requiredSlotType) {
        updateData.installSlotType = requiredSlotType;
        updateData.installSlotName = String(data.installSlotName).trim();
      }
      if (parentChanged || updateData.status === "IN_STOCK" || updateData.status === "DEPLOYED") {
        updateData.status = "INSTALLED";
      }
    } else if ((data.parentId === null || data.parentId === "none") && existingAsset.parentId && existingAsset.status === "INSTALLED") {
      updateData.status = "IN_STOCK";
      updateData.installSlotType = null;
      updateData.installSlotName = null;
    }

    if (data.productId) updateData.product = { connect: { id: data.productId } };
    if (data.warehouseId) updateData.warehouse = { connect: { id: data.warehouseId } };
    if (normalizedRackId) {
      updateData.rack = { connect: { id: normalizedRackId } };
    } else {
      updateData.rack = { disconnect: true };
    }
    if (data.parentId && data.parentId !== "none") {
      updateData.parent = { connect: { id: data.parentId } };
    } else if (data.parentId === null || data.parentId === "none") {
      updateData.parent = { disconnect: true };
    }

    // E. THỰC THI GIAO DỊCH
    const updatedAsset = await prisma.$transaction(async (tx) => {
      const asset = await tx.asset.update({
        where: { id: assetId },
        data: updateData,
      });

      // SYNC CHILD COMPONENTS
      const { count } = await tx.asset.updateMany({
        where: { parentId: assetId },
        data: {
          warehouseId: updateData.warehouse?.connect?.id || data.warehouseId,
          rackId: updateData.rack?.connect?.id || null,
          rackUnit: null,
        },
      });

      let finalNote = locationNote;
      if (count > 0) {
        finalNote += " Các linh kiện đi theo thiết bị.";
      }

      await tx.stockMovement.create({
        data: {
          type: "TRANSFER",
          note: finalNote,
          asset: { connect: { id: assetId } },
          user: { connect: { id: userId } }
        },
      });

      return asset;
    });

    return NextResponse.json(updatedAsset);
  } catch (error) {
    console.error("PATCH Asset Error:", error);
    return NextResponse.json({ error: "Lỗi cập nhật dữ liệu" }, { status: 500 });
  }
}

// ============================================================================
// 3. DELETE (Giữ nguyên phần của bạn)
// ============================================================================
export async function DELETE(req: Request, props: Props) {
  try {
    const session = await getServerSession(authOptions);
    const sessionIdentifier = session?.user?.name || (session?.user as any)?.username;

    if (!sessionIdentifier) {
      return NextResponse.json({ error: "Unauthorized. Vui lòng đăng nhập!" }, { status: 401 });
    }

    const currentUser = await prisma.user.findFirst({
      where: { OR: [{ username: sessionIdentifier }, { name: sessionIdentifier }] }
    });

    if (!currentUser) return NextResponse.json({ error: "Tài khoản không tồn tại." }, { status: 404 });
    const userId = currentUser.id;

    const resolvedParams = await props.params;
    const assetId = resolvedParams.id;

    const existingAsset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!existingAsset) return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });

    // 2️⃣ KHÓA XÓA ASSET ĐANG THUÊ
    if (existingAsset.status === "RENTED") {
      return NextResponse.json(
        { error: "Không thể xóa thiết bị đang được thuê." },
        { status: 400 }
      );
    }

    const tree = await collectAssetTree(prisma, assetId);
    const now = new Date();

    await prisma.$transaction(async (tx) => {
      for (const node of tree) {
        await tx.asset.update({
          where: { id: node.id },
          data: {
            status: "DISPOSED",
            deletedAt: now,
            deletedById: userId,
            previousStatus: node.status as any,
            previousParentId: node.parentId || null,
            previousWarehouseId: node.warehouseId || null,
            previousRackId: node.rackId || null,
            previousRackUnit: node.rackUnit ?? null,
            rackId: null,
            rackUnit: null,
          },
        });

        await tx.stockMovement.create({
          data: {
            type: "DELETE",
            note: node.id === assetId
              ? `Xóa mềm thiết bị khỏi hệ thống (Đưa vào Recycle Bin). SN: ${node.serialNumber}`
              : `Xóa mềm theo thiết bị cha ${existingAsset.serialNumber}.`,
            asset: { connect: { id: node.id } },
            user: { connect: { id: userId } }
          },
        });
      }
    });

    return NextResponse.json({ message: "Đã xóa (thanh lý) thiết bị thành công." });
  } catch (error) {
    console.error("SOFT DELETE Asset Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi thực hiện xóa thiết bị." }, { status: 500 });
  }
}
