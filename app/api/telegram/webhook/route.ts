import { NextResponse } from 'next/server';
import { handleTelegramCommand } from '@/lib/telegram-bot-service';

export async function POST(req: Request) {
    try {
        const body = await req.json();

        // Telegram webhook payload structure:
        // { message: { chat: { id: 123 }, text: "/command" } }
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id.toString();
            const text = body.message.text;

            // Xử lý các command bắt đầu bằng "/"
            if (text.startsWith('/')) {
                await handleTelegramCommand(text, chatId);
            }
        }

        // Luôn trả về 200 OK để Telegram biết Webhook đã nhận thành công.
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Lỗi webhook Telegram:', error);
        return NextResponse.json({ success: false }, { status: 500 });
    }
}
