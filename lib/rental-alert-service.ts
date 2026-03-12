import { prisma } from '@/lib/prisma';
import { sendRentalAlertEmail } from '@/lib/email-service';
import { sendRentalAlertTelegram, sendDailyTelegramReport } from '@/lib/telegram-bot-service';
import { differenceInDays, format } from 'date-fns';

/**
 * Hàm core chạy giám sát định kỳ
 * Quét toàn bộ hợp đồng ACTIVE và gửi cảnh báo
 */
export async function runRentalMonitoring() {
    const activeContracts = await prisma.rentalContract.findMany({
        where: { status: 'ACTIVE' },
        include: {
            asset: { include: { product: true } }
        }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Thống kê cho Daily Report
    const stats = { in14: 0, in7: 0, in3: 0, expired: 0 };

    for (const contract of activeContracts) {
        const endDate = new Date(contract.endDate);
        endDate.setHours(0, 0, 0, 0);

        const diffDays = differenceInDays(endDate, today);
        const dateStr = format(endDate, 'dd/MM/yyyy');
        const startDateStr = format(new Date(contract.startDate), 'dd/MM/yyyy');

        // Tạo payload chung
        const notifyPayload = {
            customerName: contract.customerName,
            deviceName: contract.asset.product.name,
            serialNumber: contract.asset.serialNumber,
            startDate: startDateStr,
            endDate: dateStr,
            daysRemaining: diffDays,
            alertType: 'EXPIRED' as any
        };

        // Kiểm tra từng mốc thời gian:
        // Cảnh báo quá hạn (expired)
        if (diffDays < 0 && !contract.alertExpiredSent) {
            notifyPayload.alertType = 'EXPIRED';
            stats.expired++;

            const emailSent = await sendRentalAlertEmail({ ...notifyPayload, to: process.env.ADMIN_EMAIL || 'admin@step.vn' });
            const tgSent = await sendRentalAlertTelegram(notifyPayload);

            if (emailSent || tgSent) {
                await prisma.rentalContract.update({ where: { id: contract.id }, data: { alertExpiredSent: true } });
            }
        }
        // Cảnh báo 1 ngày
        else if (diffDays === 1 && !contract.alert1Sent) {
            notifyPayload.alertType = '1_DAY'; // tomorrow

            const emailSent = await sendRentalAlertEmail({ ...notifyPayload, to: process.env.ADMIN_EMAIL || 'admin@step.vn' });
            const tgSent = await sendRentalAlertTelegram(notifyPayload);

            if (emailSent || tgSent) {
                await prisma.rentalContract.update({ where: { id: contract.id }, data: { alert1Sent: true } });
            }
        }
        // Cảnh báo 3 ngày
        else if (diffDays > 1 && diffDays <= 3 && !contract.alert3Sent) {
            notifyPayload.alertType = '3_DAYS';
            stats.in3++;

            const emailSent = await sendRentalAlertEmail({ ...notifyPayload, to: process.env.ADMIN_EMAIL || 'admin@step.vn' });
            const tgSent = await sendRentalAlertTelegram(notifyPayload);

            if (emailSent || tgSent) {
                await prisma.rentalContract.update({ where: { id: contract.id }, data: { alert3Sent: true } });
            }
        }
        // Cảnh báo 7 ngày
        else if (diffDays > 3 && diffDays <= 7 && !contract.alert7Sent) {
            notifyPayload.alertType = '7_DAYS';
            stats.in7++;

            const emailSent = await sendRentalAlertEmail({ ...notifyPayload, to: process.env.ADMIN_EMAIL || 'admin@step.vn' });
            const tgSent = await sendRentalAlertTelegram(notifyPayload);

            if (emailSent || tgSent) {
                await prisma.rentalContract.update({ where: { id: contract.id }, data: { alert7Sent: true } });
            }
        }
        // Cảnh báo 14 ngày
        else if (diffDays > 7 && diffDays <= 14 && !contract.alert14Sent) {
            notifyPayload.alertType = '14_DAYS';
            stats.in14++;

            const emailSent = await sendRentalAlertEmail({ ...notifyPayload, to: process.env.ADMIN_EMAIL || 'admin@step.vn' });
            const tgSent = await sendRentalAlertTelegram(notifyPayload);

            if (emailSent || tgSent) {
                await prisma.rentalContract.update({ where: { id: contract.id }, data: { alert14Sent: true } });
            }
        } else {
            // Đếm số lượng cho những hợp đồng đã gửi cảnh báo nhưng vẫn ở mốc thời gian đó (dành cho Report)
            if (diffDays < 0) stats.expired++;
            else if (diffDays <= 3) stats.in3++;
            else if (diffDays <= 7) stats.in7++;
            else if (diffDays <= 14) stats.in14++;
        }
    }

    // Gửi Daily Report qua Telegram (cho Admin biết tổng quan trong ngày)
    // Trong thực tế, Cron nên gọi hàm này lúc 8:00 AM, do đó Report sẽ được gửi mỗi sáng.
    await sendDailyTelegramReport(stats);

    return { success: true, processed: activeContracts.length, stats };
}
