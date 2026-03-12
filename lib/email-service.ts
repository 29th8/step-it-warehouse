import nodemailer from 'nodemailer';

// Cấu hình transporter với các biến môi trường
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export interface RentalAlertEmailParams {
  to: string;
  customerName: string;
  deviceName: string;
  serialNumber: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  alertType: '14_DAYS' | '7_DAYS' | '3_DAYS' | '1_DAY' | 'EXPIRED';
}

/**
 * Gửi email cảnh báo hợp đồng thuê
 */
export async function sendRentalAlertEmail(params: RentalAlertEmailParams): Promise<boolean> {
  // Bỏ qua nếu chưa config SMTP
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn('⚠️ SMTP chưa được cấu hình. Bỏ qua gửi email.');
    return false;
  }

  const { to, customerName, deviceName, serialNumber, startDate, endDate, daysRemaining, alertType } = params;

  let subject = '';
  let color = '#2563eb'; // blue

  switch (alertType) {
    case '14_DAYS':
      subject = '[CẢNH BÁO] Hợp đồng sắp hết hạn (14 ngày nữa)';
      color = '#10b981'; // green
      break;
    case '7_DAYS':
      subject = '[CẢNH BÁO] Hợp đồng sắp hết hạn (7 ngày nữa)';
      color = '#eab308'; // yellow
      break;
    case '3_DAYS':
      subject = '[QUAN TRỌNG] Hợp đồng sắp hết hạn (3 ngày nữa)';
      color = '#f97316'; // orange
      break;
    case '1_DAY':
      subject = '[KHẨN CẤP] Hợp đồng sẽ hết hạn vào ngày mai!';
      color = '#ef4444'; // red
      break;
    case 'EXPIRED':
      subject = '[QUÁ HẠN] Hợp đồng ĐÃ HẾT HẠN!';
      color = '#991b1b'; // dark red
      break;
  }

  const htmlTemplate = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
      <div style="background-color: ${color}; color: white; padding: 20px; text-align: center;">
        <h2 style="margin: 0;">${subject}</h2>
      </div>
      <div style="padding: 20px; background-color: #f8fafc;">
        <p style="font-size: 16px; color: #334155;">Kính gửi bộ phận quản lý,</p>
        <p style="font-size: 16px; color: #334155;">Dưới đây là thông tin hợp đồng thuê thiết bị cần chú ý:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin-top: 20px; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b; width: 40%;">Khách hàng:</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a;"><strong>${customerName}</strong></td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Thiết bị:</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${deviceName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Serial Number:</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-family: monospace; color: #2563eb; font-weight: bold;">${serialNumber}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Ngày bắt đầu thuê:</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a;">${startDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">Ngày hết hạn:</td>
            <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; color: #0f172a; font-weight: bold;">${endDate}</td>
          </tr>
          <tr>
            <td style="padding: 12px 15px; font-weight: bold; color: #64748b;">Thời gian còn lại:</td>
            <td style="padding: 12px 15px; color: ${color}; font-weight: bold; font-size: 18px;">
              ${alertType === 'EXPIRED' ? 'Đã quá hạn' : `${daysRemaining} ngày`}
            </td>
          </tr>
        </table>
        
        <p style="font-size: 14px; color: #64748b; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
          Vui lòng kiển tra và liên hệ với khách hàng để gia hạn hoặc thu hồi thiết bị.<br/>
          <em>Đây là email tự động từ Hệ thống Quản lý Step IT Kho, vui lòng không trả lời.</em>
        </p>
      </div>
    </div>
  `;

  try {
    const info = await transporter.sendMail({
      from: `"Step IT Warehouse" <${process.env.SMTP_USER}>`,
      to,
      subject,
      html: htmlTemplate,
    });
    console.log('Email sent: %s', info.messageId);
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
