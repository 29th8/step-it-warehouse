import { prisma } from '@/lib/prisma';
import { format } from 'date-fns';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export interface TelegramParams {
    customerName: string;
    deviceName: string;
    serialNumber: string;
    startDate: string;
    endDate: string;
    daysRemaining: number;
    alertType: '14_DAYS' | '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED';
}

/**
 * Gửi tin nhắn Telegram thông thường
 */
export async function sendTelegramMessage(text: string, chatId: string = TELEGRAM_CHAT_ID || ''): Promise<boolean> {
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
        console.warn('⚠️ Telegram Bot Token hoặc Chat ID chưa được cấu hình.');
        return false;
    }

    try {
        const res = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: 'HTML',
            }),
        });

        if (!res.ok) {
            console.error('Lỗi khi gửi Telegram:', await res.text());
            return false;
        }
        return true;
    } catch (error) {
        console.error('Lỗi kết nối Telegram API:', error);
        return false;
    }
}

/**
 * Gửi cảnh báo hợp đồng thuê qua Telegram
 */
export async function sendRentalAlertTelegram(params: TelegramParams): Promise<boolean> {
    const { customerName, deviceName, serialNumber, startDate, endDate, daysRemaining, alertType } = params;

    let header = '';
    switch (alertType) {
        case '14_DAYS': header = '🟢 [14 NGÀY] HỢP ĐỒNG SẮP HẾT HẠN'; break;
        case '7_DAYS': header = '🟡 [7 NGÀY] HỢP ĐỒNG SẮP HẾT HẠN'; break;
        case '3_DAYS': header = '🟠 [3 NGÀY] HỢP ĐỒNG SẮP HẾT HẠN'; break;
        case '1_DAY': header = '🔴 [1 NGÀY] HỢP ĐỒNG SẮP HẾT HẠN'; break;
        case 'EXPIRED': header = '🆘 [QUÁ HẠN] HỢP ĐỒNG ĐÃ HẾT HẠN'; break;
    }

    const message = `
<b>${header}</b>

👤 <b>Khách hàng:</b> ${customerName}
🖥 <b>Thiết bị:</b> ${deviceName}
🔢 <b>Serial:</b> ${serialNumber}
📅 <b>Ngày thuê:</b> ${startDate}
⏰ <b>Hết hạn:</b> ${endDate}
⌛ <b>Còn lại:</b> ${alertType === 'EXPIRED' ? 'Đã quá hạn' : `${daysRemaining} ngày`}
`;

    return await sendTelegramMessage(message);
}

/**
 * Gửi báo cáo hàng ngày qua Telegram
 */
export async function sendDailyTelegramReport(stats: { in14: number, in7: number, in3: number, expired: number }): Promise<boolean> {
    const message = `
📊 <b>DAILY RENTAL REPORT</b>

Đang đếm ngược hết hạn hợp đồng:
🟢 <b>14 ngày (Xanh):</b> ${stats.in14} hợp đồng
🟡 <b>7 ngày (Vàng):</b> ${stats.in7} hợp đồng
🟠 <b>3 ngày (Cam):</b> ${stats.in3} hợp đồng
🆘 <b>Đã hết hạn:</b> ${stats.expired} hợp đồng

<i>Gõ /contracts để xem chi tiết danh sách sắp hết hạn.</i>
`;

    return await sendTelegramMessage(message);
}

/**
 * Xử lý các lệnh từ Telegram webhook
 */
export async function handleTelegramCommand(command: string, chatId: string) {
    const cmd = command.trim().toLowerCase();

    switch (cmd) {
        case '/message':
            await sendTelegramMessage('🤖 Hệ thống Step IT Warehouse Bot đang hoạt động bình thường.', chatId);
            break;

        case '/contracts':
            // Lấy danh sách hợp đồng sắp hết hạn (trong vòng 14 ngày tới nhưng chưa hết hạn)
            const now = new Date();
            const next14Days = new Date();
            next14Days.setDate(now.getDate() + 14);

            const expiringContracts = await prisma.rentalContract.findMany({
                where: {
                    status: 'ACTIVE',
                    endDate: {
                        gt: now,
                        lte: next14Days
                    }
                },
                include: {
                    asset: { include: { product: true } }
                },
                orderBy: { endDate: 'asc' }
            });

            if (expiringContracts.length === 0) {
                await sendTelegramMessage('✅ Không có hợp đồng nào sắp hết hạn trong 14 ngày tới.', chatId);
            } else {
                let msg = '📋 <b>DANH SÁCH SẮP HẾT HẠN (14 ngày tới)</b>\n\n';
                expiringContracts.forEach((c) => {
                    msg += `🔹 <b>${c.customerName}</b>\n`;
                    msg += `🖥 ${c.asset.product.name} (SN: ${c.asset.serialNumber})\n`;
                    msg += `⏰ Hết hạn: ${format(c.endDate, 'dd/MM/yyyy')}\n\n`;
                });
                await sendTelegramMessage(msg, chatId);
            }
            break;

        case '/expired':
            // Danh sách hợp đồng đã quá hạn và vẫn ACTIVE
            const expiredContracts = await prisma.rentalContract.findMany({
                where: {
                    status: 'ACTIVE',
                    endDate: { lt: new Date() }
                },
                include: {
                    asset: { include: { product: true } }
                },
                orderBy: { endDate: 'asc' }
            });

            if (expiredContracts.length === 0) {
                await sendTelegramMessage('✅ Tuyệt vời! Không có hợp đồng nào bị quá hạn.', chatId);
            } else {
                let msg = '🆘 <b>DANH SÁCH HỢP ĐỒNG QUÁ HẠN</b>\n\n';
                expiredContracts.forEach((c) => {
                    msg += `🔻 <b>${c.customerName}</b>\n`;
                    msg += `🖥 ${c.asset.product.name} (SN: ${c.asset.serialNumber})\n`;
                    msg += `⏰ Đã hết hạn từ: ${format(c.endDate, 'dd/MM/yyyy')}\n\n`;
                });
                await sendTelegramMessage(msg, chatId);
            }
            break;

        case '/assets':
            // Danh sách thiết bị đang cho thuê
            const rentedAssets = await prisma.asset.count({
                where: { status: 'RENTED' }
            });
            await sendTelegramMessage(`📦 Hiện tại có <b>${rentedAssets}</b> thiết bị đang trong trạng thái cho thuê (RENTED).`, chatId);
            break;

        default:
            await sendTelegramMessage('❓ Lệnh không hợp lệ.\n\n<b>Các lệnh hỗ trợ:</b>\n/contracts - Ds sắp hết hạn\n/expired - Ds quá hạn\n/assets - SL thiết bị đang thuê\n/message - Test bot', chatId);
            break;
    }
}
