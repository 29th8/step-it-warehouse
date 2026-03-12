import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { revalidatePath } from "next/cache";

// POST: TẠO RACK MỚI
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, totalUnits, warehouseId, type } = body;

    if (!name || !warehouseId) {
      return NextResponse.json({ error: "Tên và Kho chứa là bắt buộc" }, { status: 400 });
    }

    const rackType = type || "DATACENTER";

    if (rackType === "DATACENTER" && !totalUnits) {
      return NextResponse.json({ error: "Rack Datacenter phải có số U" }, { status: 400 });
    }

    const newRack = await prisma.rack.create({
      data: {
        name,
        type: rackType,
        totalUnits: rackType === "STORAGE" ? undefined : (totalUnits ? parseInt(totalUnits) : 42),
        warehouse: { connect: { id: warehouseId } }
      }
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await prisma.stockMovement.create({
        data: {
          type: "CREATE_RACK",
          note: `Tạo Rack mới: ${newRack.name}`,
          userId: session.user.id,
        }
      });
    }

    revalidatePath("/racks"); // Xóa cache trang Racks
    return NextResponse.json({ data: newRack }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tạo tủ rack" }, { status: 500 });
  }
}

// PATCH: CẬP NHẬT RACK
export async function PATCH(req: Request) {
  try {
    const body = await req.json();
    const { id, name, totalUnits, type } = body;

    if (!id) {
      return NextResponse.json({ error: "Thiếu ID của tủ rack" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (type !== undefined) updateData.type = type;
    if (type === "STORAGE") {
      updateData.totalUnits = null;
    } else if (totalUnits !== undefined) {
      updateData.totalUnits = totalUnits ? parseInt(totalUnits) : undefined;
    }

    const updatedRack = await prisma.rack.update({
      where: { id },
      data: updateData,
    });

    const session = await getServerSession(authOptions);
    if (session?.user?.id) {
      await prisma.stockMovement.create({
        data: {
          type: "UPDATE_RACK",
          note: `Cập nhật Rack: ${updatedRack.name}`,
          userId: session.user.id,
        }
      });
    }

    revalidatePath("/racks");
    return NextResponse.json({ data: updatedRack });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi cập nhật tủ rack" }, { status: 500 });
  }
}

// DELETE: XÓA RACK (CÓ RÀNG BUỘC)
export async function DELETE(req: Request) {
  try {
    const { id } = await req.json();
    if (!id) {
      return NextResponse.json({ error: "Thiếu ID của tủ rack" }, { status: 400 });
    }

    // 1. Kiểm tra ràng buộc: Rack này có đang chứa tài sản nào không?
    const rack = await prisma.rack.findUnique({
      where: { id },
      include: { _count: { select: { assets: true } } }
    });

    if (!rack) {
      return NextResponse.json({ error: "Không tìm thấy tủ rack" }, { status: 404 });
    }

    if (rack._count.assets > 0) {
      return NextResponse.json(
        { error: `Không thể xóa vì đang có ${rack._count.assets} thiết bị trong tủ này.` },
        { status: 400 }
      );
    }

    // 2. Nếu rỗng, cho phép xóa
    const session = await getServerSession(authOptions);

    await prisma.$transaction(async (tx) => {
      await tx.rack.delete({ where: { id } });

      if (session?.user?.id) {
        await tx.stockMovement.create({
          data: {
            type: "DELETE_RACK",
            note: `Xóa Rack: ${rack.name}`,
            userId: session.user.id,
          }
        });
      }
    });

    revalidatePath("/racks");
    return NextResponse.json({ message: "Đã xóa tủ rack thành công" });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi hệ thống khi xóa" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const racks = await prisma.rack.findMany({
      include: {
        warehouse: true // Lấy luôn thông tin kho để hiển thị nếu cần
      },
      orderBy: {
        name: "asc"
      }
    });
    return NextResponse.json(racks);
  } catch (error) {
    console.error("GET Racks Error:", error);
    return NextResponse.json({ error: "Lỗi tải danh sách tủ rack" }, { status: 500 });
  }
}
