import { NextResponse } from 'next/server';
import { runRentalMonitoring } from '@/lib/rental-alert-service';

// Bảo mật API (tùy chọn: dùng token hoặc headers cron của bot)
// Trong Next.JS nếu dùng Vercel Cron, Vercel sẽ gửi header \`Authorization: Bearer CRON_SECRET\`
// Bài lab này mình cho phép gọi mở hoặc check pass tuỳ yêu cầu.
export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        // Bỏ comment nếu muốn bảo mật cron
        // if (authHeader !== \`Bearer \${process.env.CRON_SECRET}\`) {
        //  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        // }

        const result = await runRentalMonitoring();

        return NextResponse.json({
            success: true,
            data: result
        });
    } catch (error: any) {
        console.error('Lỗi khi chạy cron job giám sát cho thuê:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
