import { Resend } from "resend";
import nodemailer from "nodemailer";
import { logger } from "./logger.js";

const DEFAULT_FROM = "noreply@hillcountryhempfinder.com";
const CONTACT = "hempfindertx@gmail.com";

// Sender address. Must be on a domain verified with Resend (SPF/DKIM) for real
// delivery — EMAIL_FROM overrides, otherwise the verified-domain default.
const FROM = process.env.EMAIL_FROM ?? DEFAULT_FROM;

// Fetch the Resend API key from the Replit connector proxy. Credentials managed
// by the Replit Resend integration are served here rather than as a plain env
// var. (Note: the connector also exposes from_email, but we intentionally send
// from the verified hillcountryhempfinder.com domain instead.)
async function getResendKeyFromConnector(): Promise<string | null> {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  if (!hostname) return null;

  const xReplitToken = process.env.REPL_IDENTITY
    ? `repl ${process.env.REPL_IDENTITY}`
    : process.env.WEB_REPL_RENEWAL
      ? `depl ${process.env.WEB_REPL_RENEWAL}`
      : null;
  if (!xReplitToken) return null;

  try {
    const response = await fetch(
      `https://${hostname}/api/v2/connection?include_secrets=true&connector_names=resend`,
      {
        headers: {
          Accept: "application/json",
          X_REPLIT_TOKEN: xReplitToken,
        },
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      items?: Array<{ settings?: { api_key?: string } }>;
    };
    return data.items?.[0]?.settings?.api_key ?? null;
  } catch (err) {
    logger.warn({ err }, "Failed to fetch Resend key from connector");
    return null;
  }
}

// Resolve a Resend client, preferring the Replit connector integration and
// falling back to a plain RESEND_API_KEY secret.
async function getResend(): Promise<Resend | null> {
  const connectorKey = await getResendKeyFromConnector();
  if (connectorKey) return new Resend(connectorKey);

  const key = process.env.RESEND_API_KEY;
  if (key) return new Resend(key);

  return null;
}

function getSmtpTransport() {
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

async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html: string;
}): Promise<void> {
  const resend = await getResend();
  if (resend) {
    const { error } = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    if (error) {
      // Resend's SDK returns errors in the response rather than throwing.
      // Surface them (e.g. unverified sending domain) and rethrow so callers
      // can log/handle the failure.
      logger.warn(
        { err: error, to: opts.to, subject: opts.subject, from: FROM },
        "Resend rejected the email — check that the sending domain is verified",
      );
      throw new Error(`Resend error: ${error.message}`);
    }
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent via Resend");
    return;
  }

  const smtp = getSmtpTransport();
  if (smtp) {
    await smtp.sendMail({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
    });
    logger.info({ to: opts.to, subject: opts.subject }, "Email sent via SMTP");
    return;
  }

  logger.warn(
    { to: opts.to, subject: opts.subject },
    "No email provider configured — email not sent (set RESEND_API_KEY or SMTP_HOST/USER/PASS)",
  );
  // eslint-disable-next-line no-console
  console.log(
    `\n[DEV] Email to ${opts.to} | Subject: ${opts.subject}\n${opts.text}\n`,
  );
}

export async function sendPasswordResetEmail(
  toEmail: string,
  resetUrl: string,
): Promise<void> {
  const text = `You requested a password reset.\n\nClick this link to set a new password (valid for 1 hour):\n${resetUrl}\n\nIf you didn't request this, you can safely ignore this email.\n\nQuestions? Email us at ${CONTACT}`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a2226;color:#e5e7eb;border-radius:12px">
      <h2 style="color:#99CC66;margin-bottom:8px">Password Reset</h2>
      <p style="color:#9ca3af">You requested a password reset for your Hill Country Hemp Finder account.</p>
      <a href="${resetUrl}" style="display:inline-block;margin:24px 0;padding:12px 24px;background:#99CC66;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">Reset My Password</a>
      <p style="font-size:12px;color:#6b7280">This link expires in 1 hour. If you didn't request this, ignore this email.</p>
      <p style="font-size:12px;color:#4b5563">Or copy this URL:<br><code style="word-break:break-all">${resetUrl}</code></p>
      <hr style="border-color:#2d3748;margin:24px 0"/>
      <p style="font-size:11px;color:#6b7280">Questions? Reach us at <a href="mailto:${CONTACT}" style="color:#99CC66">${CONTACT}</a></p>
    </div>`;

  await sendEmail({
    to: toEmail,
    subject: "Reset your Hill Country Hemp Finder password",
    text,
    html,
  });
}

export async function sendAdminAlert(opts: {
  subject: string;
  headline: string;
  details: Array<{ label: string; value: string }>;
  adminPanelUrl: string;
}): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    logger.warn("ADMIN_EMAIL not set — skipping admin alert");
    return;
  }

  const rows = opts.details
    .map((d) => `${d.label}: ${d.value}`)
    .join("\n");

  const text = `${opts.headline}\n\n${rows}\n\nAdmin panel: ${opts.adminPanelUrl}`;

  const htmlRows = opts.details
    .map(
      (d) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#9ca3af;white-space:nowrap">${d.label}</td><td style="padding:4px 0;color:#e5e7eb">${d.value}</td></tr>`,
    )
    .join("");

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a2226;color:#e5e7eb;border-radius:12px">
      <h2 style="color:#99CC66;margin-bottom:16px">${opts.headline}</h2>
      <table style="border-collapse:collapse;width:100%;margin-bottom:24px">${htmlRows}</table>
      <a href="${opts.adminPanelUrl}" style="display:inline-block;padding:12px 24px;background:#99CC66;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">Open Admin Panel</a>
      <hr style="border-color:#2d3748;margin:24px 0"/>
      <p style="font-size:11px;color:#6b7280">Hill Country Hemp Finder — automated alert</p>
    </div>`;

  await sendEmail({ to: adminEmail, subject: opts.subject, text, html });
}

export async function sendListingApprovedEmail(
  toEmail: string,
  businessName: string,
): Promise<void> {
  const dashboardUrl = (() => {
    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    const basePath = process.env.BASE_PATH ?? "";
    return `${proto}://${domains}${basePath}/dashboard`;
  })();

  const text = `Great news — your listing for ${businessName} has been approved!\n\nYour shop is now live on the Hill Country Hemp Finder map and hemp shoppers across Texas Hill Country can find you.\n\nVisit your dashboard to upload photos, add coupons, and keep your listing up to date:\n${dashboardUrl}\n\nQuestions? Email us at ${CONTACT} — we actually respond.\n\nThanks for being part of the community,\nHill Country Hemp Finder`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a2226;color:#e5e7eb;border-radius:12px">
      <h2 style="color:#99CC66;margin-bottom:4px">You're on the map! 🌿</h2>
      <p style="color:#9ca3af;font-size:13px;margin-top:4px">Hill Country Hemp Finder — Listing Approved</p>
      <p style="color:#d1d5db;margin:16px 0">Great news — <strong style="color:#e5e7eb">${businessName}</strong> has been approved and is now live on the Hill Country Hemp Finder map.</p>
      <p style="color:#d1d5db;margin:0 0 16px">Hemp shoppers across Texas Hill Country can now find your store. Head to your dashboard to add photos, coupons, and keep your details current.</p>
      <a href="${dashboardUrl}" style="display:inline-block;margin:8px 0 24px;padding:12px 24px;background:#99CC66;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">Go to My Dashboard</a>
      <hr style="border-color:#2d3748;margin:24px 0"/>
      <p style="font-size:12px;color:#6b7280">Questions? Email <a href="mailto:${CONTACT}" style="color:#99CC66">${CONTACT}</a> — we actually respond.</p>
    </div>`;

  await sendEmail({
    to: toEmail,
    subject: `Your listing "${businessName}" is approved — Hill Country Hemp Finder`,
    text,
    html,
  });
}

export async function sendListingRejectedEmail(
  toEmail: string,
  businessName: string,
  reason: string,
): Promise<void> {
  const dashboardUrl = (() => {
    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    const basePath = process.env.BASE_PATH ?? "";
    return `${proto}://${domains}${basePath}/dashboard`;
  })();

  const text = `We've reviewed your listing for ${businessName} and unfortunately it wasn't approved at this time.\n\nReason: ${reason}\n\nYou can edit your listing and resubmit it for review at any time from your dashboard:\n${dashboardUrl}\n\nIf you have questions or think this was a mistake, please reach out at ${CONTACT}.\n\nHill Country Hemp Finder`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a2226;color:#e5e7eb;border-radius:12px">
      <h2 style="color:#e5e7eb;margin-bottom:4px">Listing Not Approved</h2>
      <p style="color:#9ca3af;font-size:13px;margin-top:4px">Hill Country Hemp Finder — Listing Review</p>
      <p style="color:#d1d5db;margin:16px 0">We've reviewed <strong style="color:#e5e7eb">${businessName}</strong> and unfortunately we weren't able to approve it at this time.</p>
      <div style="background:#2d3748;border-left:3px solid #e53e3e;border-radius:4px;padding:12px 16px;margin:0 0 20px">
        <p style="margin:0;font-size:13px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em;font-weight:600">Reason</p>
        <p style="margin:6px 0 0;color:#e5e7eb">${reason}</p>
      </div>
      <p style="color:#d1d5db;margin:0 0 16px">You can update your listing and resubmit it for review at any time from your dashboard.</p>
      <a href="${dashboardUrl}" style="display:inline-block;margin:8px 0 24px;padding:12px 24px;background:#99CC66;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">Edit My Listing</a>
      <hr style="border-color:#2d3748;margin:24px 0"/>
      <p style="font-size:12px;color:#6b7280">Questions? Email <a href="mailto:${CONTACT}" style="color:#99CC66">${CONTACT}</a></p>
    </div>`;

  await sendEmail({
    to: toEmail,
    subject: `Your listing "${businessName}" — update required`,
    text,
    html,
  });
}

export async function sendWelcomeEmail(toEmail: string): Promise<void> {
  const dashboardUrl = (() => {
    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    const basePath = process.env.BASE_PATH ?? "";
    return `${proto}://${domains}${basePath}/dashboard`;
  })();

  const text = `Welcome to Hill Country Hemp Finder!\n\nYour account is live. Head to your dashboard to add your listing so hemp shoppers across Texas Hill Country can find you:\n${dashboardUrl}\n\nWe're currently in Beta and building toward a full public app-store launch. Your profile and feedback help make the platform better for every shop in the region.\n\nQuestions or feedback? Email us at ${CONTACT} — we actually respond.\n\nThanks for joining,\nHill Country Hemp Finder`;

  const html = `
    <div style="font-family:sans-serif;max-width:480px;margin:auto;padding:32px 24px;background:#1a2226;color:#e5e7eb;border-radius:12px">
      <h2 style="color:#99CC66;margin-bottom:4px">Welcome to Hill Country Hemp Finder!</h2>
      <p style="color:#9ca3af;font-size:13px;margin-top:4px">🌿 Beta — Built for Texas Hill Country Hemp Shops</p>
      <p style="color:#d1d5db;margin:16px 0">Your account is ready. Complete your listing so hemp shoppers across Texas Hill Country can find your store on the map.</p>
      <a href="${dashboardUrl}" style="display:inline-block;margin:16px 0;padding:12px 24px;background:#99CC66;color:#000;font-weight:bold;border-radius:8px;text-decoration:none">Go to My Dashboard</a>
      <p style="color:#9ca3af;font-size:13px;margin-top:16px">We're in <strong style="color:#e5e7eb">Beta</strong> — your listing and feedback help build the platform ahead of our public app-store launch. Early shops get the best visibility.</p>
      <hr style="border-color:#2d3748;margin:24px 0"/>
      <p style="font-size:12px;color:#6b7280">Questions? Email <a href="mailto:${CONTACT}" style="color:#99CC66">${CONTACT}</a> — we actually respond.</p>
    </div>`;

  await sendEmail({
    to: toEmail,
    subject: "Welcome to Hill Country Hemp Finder 🌿",
    text,
    html,
  });
}
