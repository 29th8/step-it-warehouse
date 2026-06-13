import { NextResponse } from 'next/server';
import { runRentalMonitoring } from '@/lib/rental-alert-service';

export async function GET(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const result = await runRentalMonitoring();
        return NextResponse.json({ success: true, data: result });
    } catch (error: any) {
        console.error('Lỗi khi chạy cron job giám sát cho thuê:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
