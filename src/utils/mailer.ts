import nodemailer from "nodemailer";
import { env } from "../config/env.js";

interface SendEmailInput {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

function hasSmtpConfig(): boolean {
  return Boolean(env.smtpHost && env.smtpPort && env.smtpUser && env.smtpPass && env.smtpFrom);
}

export async function sendEmail(input: SendEmailInput): Promise<boolean> {
  if (!hasSmtpConfig()) {
    console.warn("SMTP not configured. Skipping email send.");
    return false;
  }

  const transporter = nodemailer.createTransport({
    host: env.smtpHost,
    port: env.smtpPort,
    secure: env.smtpSecure,
    auth: {
      user: env.smtpUser,
      pass: env.smtpPass,
    },
  });

  await transporter.sendMail({
    from: env.smtpFrom,
    to: input.to,
    subject: input.subject,
    text: input.text,
    html: input.html,
  });

  return true;
}
