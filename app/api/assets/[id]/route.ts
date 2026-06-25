import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "../../auth/[...nextauth]/route";
// Giả định bạn đã tạo file này theo gợi ý của AI trước đó
import { checkRackOverlap } from "@/lib/rack-utils";

type Props = { params: Promise<{ id: string }> };

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
        product: true,
        warehouse: true,
        rack: true,
        parent: { include: { product: true } },
        components: { include: { product: true } },
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

    return NextResponse.json(asset);
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
        parent: { select: { id: true, status: true } },
      },
    });

    if (!existingAsset) {
      return NextResponse.json({ error: "Không tìm thấy thiết bị." }, { status: 404 });
    }

    const hasActiveRental = existingAsset.rentalContracts.length > 0;
    const parentIsRented = existingAsset.parent?.status === "RENTED";

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

    // Rule d: Linh kiện thuộc server đang cho thuê → không được đổi trạng thái
    if (parentIsRented) {
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

      if (data[field] !== undefined && newDataValue !== existingValue) {
        violatedFields.push(violationLabels[field] || field);
      }
    }

    if (violatedFields.length > 0) {
      let reason = "Chỉ được phép cập nhật thông tin vận hành (Ghi chú, v.v).";
      if (hasActiveRental) reason = "Thiết bị đang có hợp đồng thuê active. Hãy kết thúc hợp đồng trước.";
      if (parentIsRented && violatedFields.includes("Trạng thái")) reason = "Linh kiện đang gắn vào thiết bị mẹ đang cho thuê. Không thể thay đổi trạng thái.";
      return NextResponse.json({
        error: `Không thể thay đổi: ${violatedFields.join(", ")}. ${reason}`
      }, { status: 400 });
    }

    // ------------------------------------------------------------------------
    // MỚI: BẢO MẬT & VALIDATION ASSET LIFECYCLE (ENTERPRISE LOGIC)
    // ------------------------------------------------------------------------
    if (data.status && data.status !== existingAsset.status) {
      const allowedTransitions: Record<string, string[]> = {
        "IN_STOCK": ["RESERVED", "DEPLOYED", "RENTED", "FAULTY", "MAINTENANCE", "DISPOSED"],
        "RESERVED": ["DEPLOYED", "IN_STOCK"],
        "DEPLOYED": ["MAINTENANCE", "FAULTY", "IN_STOCK"],
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

    const locationChanged =
      existingAsset.rackId !== data.rackId ||
      existingAsset.rackUnit !== Number(data.rackUnit) ||
      existingAsset.uHeight !== Number(data.uHeight);

    // MỚI: LOGIC VALIDATE TRÙNG LẶP VÀ CHIỀU CAO RACK (CHỈ DATACENTER)
    // ------------------------------------------------------------------------
    if (data.rackId && data.rackUnit && locationChanged) {
      const rack = await prisma.rack.findUnique({
        where: { id: data.rackId },
        include: {
          assets: { select: { id: true, rackUnit: true, uHeight: true } }
        }
      });

      if (!rack) return NextResponse.json({ error: "Rack không tồn tại" }, { status: 404 });

      // Chỉ validate cho Rack DATACENTER
      if (rack.type === "DATACENTER" && rack.totalUnits) {
        const newHeight = parseInt(data.uHeight || 1);
        const newUnit = parseInt(data.rackUnit);

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
    if (data.rackId) {
      const rack = await prisma.rack.findUnique({ where: { id: data.rackId } });
      if (rack) rackName = rack.name;
    }

    const uText = data.uHeight ? ` (Cỡ: ${data.uHeight}U)` : "";
    const rackUnitText = data.rackUnit ? ` - Vị trí U: ${data.rackUnit}${uText}` : "";
    const locationNote = `Cập nhật vị trí: ${warehouse?.name || "N/A"} - Tủ: ${rackName}${rackUnitText}. Trạng thái: ${data.status}. Ghi chú: ${data.notes || "Không"}`;

    // D. CHUẨN BỊ DATA UPDATE
    const updateData: any = {
      serialNumber: data.serialNumber,
      status: data.status,
      notes: data.notes,
      owner: data.owner !== undefined ? (data.owner || null) : undefined,
      uHeight: data.uHeight ? parseInt(data.uHeight) : 1,
      rackUnit: data.rackUnit ? parseInt(data.rackUnit) : null,
    };

    if (data.productId) updateData.product = { connect: { id: data.productId } };
    if (data.warehouseId) updateData.warehouse = { connect: { id: data.warehouseId } };
    if (data.rackId) {
      updateData.rack = { connect: { id: data.rackId } };
    } else {
      updateData.rack = { disconnect: true };
    }
    if (data.parentId) {
      updateData.parent = { connect: { id: data.parentId } };
    } else if (data.parentId === null) {
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
          rackId: updateData.rack?.connect?.id || data.rackId || null,
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

    await prisma.$transaction(async (tx) => {
      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: "DISPOSED",
          deletedAt: new Date(),
          deletedById: userId,
          rack: { disconnect: true },
          rackUnit: null,
          parent: { disconnect: true } // Disconnect from parent if any
        },
      });

      await tx.stockMovement.create({
        data: {
          type: "DELETE",
          note: `Xóa mềm thiết bị khỏi hệ thống (Đưa vào Recycle Bin). SN: ${existingAsset.serialNumber}`,
          asset: { connect: { id: assetId } },
          user: { connect: { id: userId } }
        },
      });
    });

    return NextResponse.json({ message: "Đã xóa (thanh lý) thiết bị thành công." });
  } catch (error) {
    console.error("SOFT DELETE Asset Error:", error);
    return NextResponse.json({ error: "Lỗi hệ thống khi thực hiện xóa thiết bị." }, { status: 500 });
  }
}