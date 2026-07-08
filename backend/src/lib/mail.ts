import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export async function sendEmail(
  to: string[],
  subject: string,
  html: string
): Promise<void> {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('Email not configured — set EMAIL_USER and EMAIL_PASS in .env');
    return;
  }

  const validTo = to.filter(Boolean);
  if (validTo.length === 0) return;

  console.log(`Sending email to ${validTo.join(', ')}: ${subject}`);
  try {
    const info = await transporter.sendMail({
      from: `"Ggallery" <${process.env.EMAIL_USER}>`,
      to: validTo.join(', '),
      subject,
      html,
    });
    console.log(`Email sent: ${info.messageId}`);
  } catch (err) {
    console.error('Failed to send email:', err);
  }
}

export function buildNotificationEmail(
  title: string,
  message: string,
  userName?: string
): { subject: string; html: string } {
  const greeting = userName ? `<p>Hi ${userName},</p>` : '<p>Hi,</p>';
  return {
    subject: `[Ggallery] ${title}`,
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#fafafa;border-radius:12px;">
        <div style="background:#18181b;color:white;padding:20px 24px;border-radius:8px 8px 0 0;">
          <h1 style="margin:0;font-size:18px;font-weight:800;">${title}</h1>
        </div>
        <div style="background:white;padding:24px;border-radius:0 0 8px 8px;border:1px solid #e4e4e7;">
          ${greeting}
          <p style="color:#3f3f46;font-size:15px;line-height:1.6;">${message}</p>
          <hr style="border:none;border-top:1px solid #e4e4e7;margin:20px 0;" />
          <p style="color:#a1a1aa;font-size:12px;">
            You received this because you have an account on Ggallery.
          </p>
        </div>
      </div>
    `,
  };
}
