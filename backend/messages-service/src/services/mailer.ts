import { config } from '@/utils/config';
import nodemailer from 'nodemailer';

export const transporter = nodemailer.createTransport({
  host: config.SMTP_HOST,
  port: config.SMTP_PORT,
  secure: config.SMTP_SECURE,
  auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
});

export async function sendContactEmail(params: {
  fromName: string;
  fromEmail: string;
  phone?: string;
  body: string;
  context?: any;
}) {
  const { fromName, fromEmail, phone, body } = params;
  const subject = `Novo contacto: ${fromName}`;
  const html = `<div>
    <p><strong>Nome:</strong> ${fromName}</p>
    <p><strong>Email:</strong> ${fromEmail}</p>
    ${phone ? `<p><strong>Telefone:</strong> ${phone}</p>` : ''}
    <p><strong>Mensagem:</strong></p>
    <pre>${body}</pre>
  </div>`;

  return transporter.sendMail({
    from: config.EMAIL_FROM,
    to: config.EMAIL_FROM,
    subject,
    html,
    replyTo: fromEmail,
  });
}


