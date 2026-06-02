import nodemailer from "nodemailer";
import { logger } from "./logger.js";

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (SMTP_HOST && SMTP_USER && SMTP_PASS) {
    return nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_PORT === "465",
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });
  }
  return null;
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string,
): Promise<void> {
  const from = process.env.SMTP_FROM ?? "noreply@hillcountryhempfinder.com";
  const subject = "Reset your Hill Country Hemp Finder password";
  const text = `You requested a password reset.\n\nClick this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can ignore this email.`;
  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a2226;color:#e5e7eb;border-radius:12px">
      <h2 style="color:#99CC66;margin-bottom:8px">Password Reset</h2>
      <p style="color:#9ca3af">You requested a password reset for your Hill Country Hemp Finder account.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#99CC66;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">Reset My Password</a>
      <p style="font-size:12px;color:#6b7280">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      <p style="font-size:12px;color:#4b5563">Or copy this URL:<br><code style="word-break:break-all">${resetUrl}</code></p>
    </div>`;

  const transport = getTransport();
  if (transport) {
    await transport.sendMail({ from, to: toEmail, subject, text, html });
    logger.info({ to: toEmail }, "Password reset email sent");
  } else {
    logger.warn(
      { to: toEmail, resetUrl },
      "SMTP not configured — password reset URL logged to console (dev mode)",
    );
    // eslint-disable-next-line no-console
    console.log(`\n[DEV] Password reset link for ${toEmail}:\n${resetUrl}\n`);
  }
}
