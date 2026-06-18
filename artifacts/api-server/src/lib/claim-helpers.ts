import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and, gte, isNull, sql, or } from "drizzle-orm";
import {
  db,
  claimsTable,
  claimAuditLogsTable,
  flaggedIpsTable,
} from "@workspace/db";
import { logger } from "./logger.js";
import { sendAdminAlert } from "./mailer.js";

// ── Generic/public email domains blocklist ───────────────────────────────
export const GENERIC_DOMAINS = new Set([
  "gmail.com", "googlemail.com",
  "yahoo.com", "yahoo.co.uk", "yahoo.ca", "ymail.com",
  "outlook.com", "hotmail.com", "hotmail.co.uk", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me",
  "mail.com", "gmx.com", "gmx.net",
  "aol.com",
  "inbox.com",
  "zoho.com",
  "tutanota.com",
  "fastmail.com",
]);

// ── Domain extraction ─────────────────────────────────────────────────────

export function extractEmailDomain(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at < 0) return null;
  return email.slice(at + 1).toLowerCase().trim();
}

export function extractWebsiteDomain(website: string | null | undefined): string | null {
  if (!website) return null;
  try {
    const url = new URL(website.startsWith("http") ? website : `https://${website}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isHighTrustMatch(emailDomain: string, websiteDomain: string): boolean {
  if (GENERIC_DOMAINS.has(emailDomain)) return false;
  return emailDomain === websiteDomain;
}

// ── OTP helpers ───────────────────────────────────────────────────────────

export function generateOtp(): string {
  return (Math.floor(100000 + crypto.randomInt(900000))).toString();
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10);
}

export async function verifyOtp(otp: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(otp, hash);
  } catch {
    return false;
  }
}

// ── Immutable audit logging ───────────────────────────────────────────────

export async function appendAuditLog(opts: {
  claimId?: number | null;
  actorUserId?: number | null;
  actorSessionId?: string | null;
  clientIp?: string | null;
  actionType: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  try {
    await db.insert(claimAuditLogsTable).values({
      claimId: opts.claimId ?? null,
      actorUserId: opts.actorUserId ?? null,
      actorSessionId: opts.actorSessionId ?? null,
      clientIp: opts.clientIp ?? null,
      actionType: opts.actionType,
      metadata: opts.metadata ? JSON.stringify(opts.metadata) : null,
    });
  } catch (err) {
    logger.warn({ err }, "Failed to append claim audit log");
  }
}

// ── Rate limiting (Postgres-backed, no Redis needed) ─────────────────────

const USER_QUOTA = 5;
const USER_WINDOW_MS = 24 * 60 * 60 * 1000;

export async function checkUserRateLimit(userId: number): Promise<boolean> {
  const windowStart = new Date(Date.now() - USER_WINDOW_MS);
  const rows = await db
    .select({ id: claimsTable.id })
    .from(claimsTable)
    .where(
      and(
        eq(claimsTable.userId, userId),
        gte(claimsTable.createdAt, windowStart),
      ),
    );
  return rows.length < USER_QUOTA;
}

// Block on the IP_QUOTA-th attempt: allow (IP_QUOTA - 1) prior attempts,
// then block when rows.length reaches IP_QUOTA - 1 (i.e. the next would be
// the IP_QUOTA-th) — satisfying "lockout at 50+ attempts."
const IP_QUOTA = 50;
const IP_WINDOW_MS = 10 * 60 * 1000;

export async function checkIpRateLimit(ip: string): Promise<boolean> {
  const windowStart = new Date(Date.now() - IP_WINDOW_MS);
  const rows = await db
    .select({ id: claimAuditLogsTable.id })
    .from(claimAuditLogsTable)
    .where(
      and(
        eq(claimAuditLogsTable.clientIp, ip),
        eq(claimAuditLogsTable.actionType, "claim_initiated"),
        gte(claimAuditLogsTable.timestamp, windowStart),
      ),
    );
  // rows.length is the count of PRIOR attempts; block when already at IP_QUOTA - 1
  // so the IP_QUOTA-th attempt is the first rejected.
  return rows.length < IP_QUOTA - 1;
}

export async function isIpCurrentlyFlagged(ip: string): Promise<boolean> {
  const [row] = await db
    .select({ id: flaggedIpsTable.id })
    .from(flaggedIpsTable)
    .where(
      and(
        eq(flaggedIpsTable.ip, ip),
        isNull(flaggedIpsTable.clearedAt),
      ),
    );
  return !!row;
}

export async function flagIp(ip: string, reason: string): Promise<void> {
  try {
    await db
      .insert(flaggedIpsTable)
      .values({ ip, flaggedReason: reason })
      .onConflictDoNothing();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domain.includes("localhost") ? "http" : "https";
    const basePath = process.env.BASE_PATH ?? "";
    sendAdminAlert({
      subject: "⚠️ Suspicious IP flagged on claim endpoint",
      headline: "IP address flagged for abuse on claim endpoint",
      details: [
        { label: "IP address", value: ip },
        { label: "Reason", value: reason },
      ],
      adminPanelUrl: `${proto}://${domain}${basePath}/admin`,
    }).catch((err: unknown) => {
      logger.warn({ err }, "Failed to send IP-flag admin alert");
    });
  } catch (err) {
    logger.warn({ err, ip }, "Failed to flag IP");
  }
}

// ── Client IP extraction ──────────────────────────────────────────────────
// Express populates req.ip correctly when "trust proxy" is set in app.ts.
// Do NOT manually read x-forwarded-for here — that would bypass Express's
// validated trust chain and allow clients to spoof the header.

export function getClientIp(req: { ip?: string }): string {
  return req.ip ?? "unknown";
}
