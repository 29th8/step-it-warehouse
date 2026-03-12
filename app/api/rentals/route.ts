import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { AssetStatus, RentalStatus, Prisma } from "@prisma/client"; // Import chuẩn từ Prisma
import { differenceInDays, startOfDay } from "date-fns";

// API POST: Tạo hợp đồng thuê mới
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { assetId, customerName, startDate, durationMonths } = body;

    // 1. Validate Input cơ bản
    if (!assetId || !customerName || !startDate || !durationMonths) {
      return NextResponse.json(
        { error: "Thiếu thông tin bắt buộc" },
        { status: 400 }
      );
    }

    // 2. Tính toán ngày kết thúc
    const start = new Date(startDate);
    const end = new Date(start);
    end.setMonth(end.getMonth() + Number(durationMonths));

    // 3. Thực thi Transaction (Kiểm tra + Tạo mới + Cập nhật)
    const result = await prisma.$transaction(async (tx) => {
      // A. Lấy thông tin Asset và CHỈ tìm các hợp đồng đang ACTIVE
      const asset = await tx.asset.findUnique({
        where: { id: assetId },
        include: {
          rentalContracts: {
            where: {
              status: RentalStatus.ACTIVE // Chỉ quan tâm hợp đồng đang chạy
            }
          }
        }
      });

      // B. Kiểm tra tồn tại
      if (!asset) {
        throw new Error("ASSET_NOT_FOUND");
      }

      // C. Kiểm tra trạng thái kho
      // Phải chắc chắn thiết bị đang nằm trong kho (IN_STOCK) mới được đem đi thuê
      if (asset.status !== AssetStatus.IN_STOCK) {
        throw new Error("ASSET_NOT_IN_STOCK");
      }

      // D. Kiểm tra trùng hợp đồng
      // Nếu mảng activeContracts có phần tử -> nghĩa là đang bị thuê bởi người khác
      if (asset.rentalContracts.length > 0) {
        throw new Error("ASSET_HAS_ACTIVE_CONTRACT");
      }

      // E. Tạo hợp đồng thuê mới
      const newContract = await tx.rentalContract.create({
        data: {
          assetId,
          customerName,
          startDate: start,
          endDate: end,
          status: RentalStatus.ACTIVE,
        },
      });

      // F. Cập nhật trạng thái thiết bị sang RENTED
      await tx.asset.update({
        where: { id: assetId },
        data: {
          status: AssetStatus.RENTED,
        },
      });

      // G. Ghi log hệ thống CREATE_RENTAL và EXPORT vật lý
      const session = await getServerSession(authOptions);
      if (session?.user?.id) {
        await tx.stockMovement.create({
          data: {
            type: "CREATE_RENTAL",
            note: `Tạo hợp đồng thuê cho khách hàng: ${customerName} - Thiết bị ${asset.serialNumber}`,
            userId: session.user.id,
            assetId: assetId
          }
        });

        await tx.stockMovement.create({
          data: {
            type: "EXPORT",
            note: `Thiết bị ${asset.serialNumber} được xuất kho cho thuê theo hợp đồng của ${customerName}`,
            userId: session.user.id,
            assetId: assetId
          }
        });
      }

      return newContract;
    });

    return NextResponse.json({ data: result }, { status: 201 });

  } catch (error: unknown) {
    console.error("Create Rental Error:", error);

    // Xử lý các lỗi logic nghiệp vụ
    if (error instanceof Error) {
      switch (error.message) {
        case "ASSET_NOT_FOUND":
          return NextResponse.json({ error: "Không tìm thấy thiết bị" }, { status: 404 });
        case "ASSET_NOT_IN_STOCK":
          return NextResponse.json({ error: "Thiết bị không sẵn sàng (Trạng thái không phải IN_STOCK)" }, { status: 409 });
        case "ASSET_HAS_ACTIVE_CONTRACT":
          return NextResponse.json({ error: "Thiết bị đang có hợp đồng thuê khác chưa kết thúc" }, { status: 409 });
      }
    }

    return NextResponse.json({ error: "Lỗi hệ thống khi tạo hợp đồng" }, { status: 500 });
  }
}

// API GET: Lấy danh sách hợp đồng
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get("status");

    let whereClause: Prisma.RentalContractWhereInput = {};

    if (statusParam === "ACTIVE") {
      whereClause.status = "ACTIVE";
    } else if (statusParam === "RETURNED") {
      whereClause.status = "RETURNED";
    } else if (statusParam === "EXPIRED") {
      // NOTE: EXPIRED is not an official Prisma enum status in this exact scenario if you don't update it to EXPIRED in db automatically
      // But we will query it if it's explicitly set. Actually, we should check what user meant by EXPIRED.
      // Usually if status === 'EXPIRED' maybe it's saved in DB or calculated.
      whereClause.status = "EXPIRED";
      // We will also calculate daysRemaining on the fly below.
    } else if (statusParam !== "ALL") {
      // Default: không hiển thị RETURNED
      whereClause.status = {
        not: "RETURNED"
      };
    }

    const rentals = await prisma.rentalContract.findMany({
      where: whereClause,
      include: {
        asset: {
          include: { product: true }
        }
      },
      orderBy: { createdAt: "desc" }
    });

    // Tính toán daysRemaining
    const today = startOfDay(new Date());

    const enrichedRentals = rentals.map((rental) => {
      const end = startOfDay(new Date(rental.endDate));
      const daysRemaining = differenceInDays(end, today);

      return {
        ...rental,
        daysRemaining
      };
    });

    return NextResponse.json({ data: enrichedRentals });
  } catch (error) {
    return NextResponse.json({ error: "Lỗi tải danh sách hợp đồng" }, { status: 500 });
  }
}