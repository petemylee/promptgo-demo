import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth:
    process.env.SMTP_USER && process.env.SMTP_PASSWORD
      ? {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        }
      : undefined,
});

export type SendMailOptions = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

export async function sendMail({ to, subject, html, text }: SendMailOptions): Promise<boolean> {
  if (!process.env.SMTP_HOST) {
    console.warn('SMTP is not configured. Skip sending email.');
    return false;
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@localhost';

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
      text: text ?? undefined,
    });
    return true;
  } catch (error) {
    console.error('Error sending email:', error);
    return false;
  }
}
