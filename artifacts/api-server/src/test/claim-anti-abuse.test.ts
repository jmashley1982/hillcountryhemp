import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  vi,
} from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { eq, and } from "drizzle-orm";

vi.mock("../lib/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminAlert: vi.fn().mockResolvedValue(undefined),
  sendListingApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendListingRejectedEmail: vi.fn().mockResolvedValue(undefined),
  sendClaimOtpEmail: vi.fn().mockResolvedValue(undefined),
  sendOwnerContestNotification: vi.fn().mockResolvedValue(undefined),
  sendClaimApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendClaimRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));

import app from "../app";
import {
  db,
  pool,
  usersTable,
  businessesTable,
  claimsTable,
  claimAuditLogsTable,
  flaggedIpsTable,
} from "@workspace/db";

const ts = Date.now();
const CLAIMANT_EMAIL = `claimant-${ts}@example.com`;
const OWNER_EMAIL = `bizowner-${ts}@example.com`;
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "admin@test.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "changeme";

let claimantId: number;
let ownerId: number;
let businessId: number;
let ownedBusinessId: number;
let claimantCookie: string;
let ownerCookie: string;
let adminCookie: string;

async function loginAs(email: string, password: string): Promise<string> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password });
  const raw = res.headers["set-cookie"];
  if (!raw) throw new Error(`Login failed for ${email}: ${res.status}`);
  const cookies = Array.isArray(raw) ? raw : [raw as string];
  return cookies.join("; ");
}

async function seedUsers(): Promise<void> {
  const hash = await bcrypt.hash("pass-1234", 10);
  const [u1] = await db.insert(usersTable).values({ email: CLAIMANT_EMAIL, passwordHash: hash, role: "business" }).returning();
  claimantId = u1.id;
  const [u2] = await db.insert(usersTable).values({ email: OWNER_EMAIL, passwordHash: hash, role: "business" }).returning();
  ownerId = u2.id;
}

async function seedBusinesses(): Promise<void> {
  // Business with no owner (generic domain) — for document path
  const [b1] = await db.insert(businessesTable).values({
    name: `Test Biz ${ts}`,
    address: "1 Main St",
    city: "Fredericksburg",
    state: "TX",
    phone: "5550001111",
    website: "https://gmail.com/testbiz",
    status: "approved",
    ownerId: null,
    lat: "30.27",
    lng: "-98.87",
  } as Parameters<typeof db.insert>[0] extends (typeof db.insert<typeof businessesTable>) ? never : never).returning();
  businessId = b1.id;

  // Business owned by ownerId — for owner-decision tests
  const [b2] = await db.insert(businessesTable).values({
    name: `Owned Biz ${ts}`,
    address: "2 Oak Ave",
    city: "Kerrville",
    state: "TX",
    phone: "5550002222",
    website: "https://gmail.com/ownedbiz",
    status: "approved",
    ownerId,
    lat: "30.0",
    lng: "-99.0",
  } as Parameters<typeof db.insert>[0] extends (typeof db.insert<typeof businessesTable>) ? never : never).returning();
  ownedBusinessId = b2.id;
}

async function cleanup(): Promise<void> {
  if (claimantId) {
    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, claimantId));
    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, ownerId));
    await db.delete(claimsTable).where(eq(claimsTable.userId, claimantId));
    await db.delete(claimsTable).where(eq(claimsTable.userId, ownerId));
    if (businessId) await db.delete(businessesTable).where(eq(businessesTable.id, businessId));
    if (ownedBusinessId) await db.delete(businessesTable).where(eq(businessesTable.id, ownedBusinessId));
    await db.delete(usersTable).where(eq(usersTable.id, claimantId));
    await db.delete(usersTable).where(eq(usersTable.id, ownerId));
  }
}

beforeAll(async () => {
  await cleanup();
  await seedUsers();
  await seedBusinesses();
  claimantCookie = await loginAs(CLAIMANT_EMAIL, "pass-1234");
  ownerCookie = await loginAs(OWNER_EMAIL, "pass-1234");
  adminCookie = await loginAs(ADMIN_EMAIL, ADMIN_PASSWORD);
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

// ── 1. Document security ─────────────────────────────────────────────────────
describe("claim document access control", () => {
  it("blocks public access to claim-doc-* files via /api/uploads/", async () => {
    const res = await request(app).get("/api/uploads/claim-doc-abc123.pdf");
    expect(res.status).toBe(403);
  });

  it("returns 404 (not 403) for non-claim uploads that do not exist", async () => {
    const res = await request(app).get("/api/uploads/nonexistent-logo.png");
    expect(res.status).toBe(404);
  });

  it("admin document endpoint requires authentication", async () => {
    const res = await request(app).get("/api/admin/claims/1/document");
    expect(res.status).toBe(401);
  });

  it("admin document endpoint returns 404 for claim with no document", async () => {
    // Insert a bare claim with no document
    const [claim] = await db.insert(claimsTable).values({
      businessId: businessId!,
      userId: claimantId,
      status: "AWAITING_DOCUMENT",
      claimantEmail: CLAIMANT_EMAIL,
    }).returning();

    const res = await request(app)
      .get(`/api/admin/claims/${claim.id}/document`)
      .set("Cookie", adminCookie);
    expect(res.status).toBe(404);
    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });
});

// ── 2. IP rate limiting counts all attempts ───────────────────────────────────
describe("IP rate limiting", () => {
  it("logs a claim_attempt audit event on EVERY request, even failures", async () => {
    // Non-existent business → 404 after claim_attempt is logged
    const before = await db
      .select()
      .from(claimAuditLogsTable)
      .where(and(eq(claimAuditLogsTable.actionType, "claim_attempt")));

    await request(app)
      .post("/api/businesses/999999/claim")
      .set("Cookie", claimantCookie)
      .send({ email: CLAIMANT_EMAIL });

    const after = await db
      .select()
      .from(claimAuditLogsTable)
      .where(and(eq(claimAuditLogsTable.actionType, "claim_attempt")));

    // The attempt was logged even though the business doesn't exist
    expect(after.length).toBeGreaterThan(before.length);
  });
});

// ── 3. Claim status returns newest active claim ───────────────────────────────
describe("GET /api/businesses/:id/claim/status", () => {
  it("returns 404 when there is no active claim", async () => {
    const res = await request(app)
      .get(`/api/businesses/${businessId}/claim/status`)
      .set("Cookie", claimantCookie);
    expect(res.status).toBe(404);
  });

  it("returns the newest active claim when multiple exist", async () => {
    // Seed an old completed claim and a newer active claim for the same user+business
    const [older] = await db.insert(claimsTable).values({
      businessId: businessId!,
      userId: claimantId,
      status: "PENDING_MANUAL_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
    }).returning();

    const [newer] = await db.insert(claimsTable).values({
      businessId: businessId!,
      userId: claimantId,
      status: "AWAITING_DOCUMENT",
      claimantEmail: CLAIMANT_EMAIL,
    }).returning();

    const res = await request(app)
      .get(`/api/businesses/${businessId}/claim/status`)
      .set("Cookie", claimantCookie);

    expect(res.status).toBe(200);
    // Should return the newer claim
    expect(res.body.id).toBe(newer.id);

    await db.delete(claimsTable).where(eq(claimsTable.id, older.id));
    await db.delete(claimsTable).where(eq(claimsTable.id, newer.id));
  });
});

// ── 4. Owner-decision covers both claim paths ─────────────────────────────────
describe("POST /api/businesses/:id/claim/owner-decision", () => {
  it("requires authentication", async () => {
    const res = await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .send({ decision: "approve" });
    expect(res.status).toBe(401);
  });

  it("returns 403 when the caller is not the current owner", async () => {
    const res = await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .set("Cookie", claimantCookie)
      .send({ decision: "approve" });
    expect(res.status).toBe(403);
  });

  it("returns 404 when no claim with active contestDeadline exists", async () => {
    const res = await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .set("Cookie", ownerCookie)
      .send({ decision: "approve" });
    expect(res.status).toBe(404);
  });

  it("owner can contest a PENDING_OWNER_REVIEW claim (OTP path)", async () => {
    const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const [claim] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_OWNER_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline,
    }).returning();

    const res = await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .set("Cookie", ownerCookie)
      .send({ decision: "contest" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.status).toBe("PENDING_MANUAL_REVIEW");

    // contestDeadline should be nulled so claim drops off the owner's list
    const [updated] = await db.select().from(claimsTable).where(eq(claimsTable.id, claim.id));
    expect(updated.contestDeadline).toBeNull();

    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, claimantId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });

  it("owner can contest a PENDING_MANUAL_REVIEW claim with future contestDeadline (doc path)", async () => {
    const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const [claim] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_MANUAL_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline,
      documentPath: "claim-doc-test.pdf",
    }).returning();

    const res = await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .set("Cookie", ownerCookie)
      .send({ decision: "contest" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Status stays PENDING_MANUAL_REVIEW; contestDeadline is nulled
    expect(res.body.status).toBe("PENDING_MANUAL_REVIEW");

    const [updated] = await db.select().from(claimsTable).where(eq(claimsTable.id, claim.id));
    expect(updated.contestDeadline).toBeNull();

    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, claimantId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });

  it("owner can approve a PENDING_OWNER_REVIEW claim, transferring ownership", async () => {
    const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const [claim] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_OWNER_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline,
    }).returning();

    const res = await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .set("Cookie", ownerCookie)
      .send({ decision: "approve" });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("APPROVED");

    // Ownership should have transferred to claimantId
    const [biz] = await db.select({ ownerId: businessesTable.ownerId }).from(businessesTable).where(eq(businessesTable.id, ownedBusinessId!));
    expect(biz.ownerId).toBe(claimantId);

    // Restore ownership for subsequent tests
    await db.update(businessesTable).set({ ownerId }).where(eq(businessesTable.id, ownedBusinessId!));
    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, claimantId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });
});

// ── 5. Admin 72-hour gate applies regardless of claim status ─────────────────
describe("PATCH /api/admin/claims/:id (72-hour gate)", () => {
  it("blocks resolution of PENDING_MANUAL_REVIEW claim with future contestDeadline", async () => {
    const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const [claim] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_MANUAL_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline,
      documentPath: "claim-doc-test.pdf",
    }).returning();

    const res = await request(app)
      .patch(`/api/admin/claims/${claim.id}`)
      .set("Cookie", adminCookie)
      .send({ status: "APPROVED" });

    expect(res.status).toBe(409);
    expect(res.body).toHaveProperty("contestDeadline");

    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });

  it("allows resolution with override:true even within the contest window", async () => {
    const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const [claim] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_MANUAL_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline,
      documentPath: "claim-doc-test.pdf",
    }).returning();

    const res = await request(app)
      .patch(`/api/admin/claims/${claim.id}`)
      .set("Cookie", adminCookie)
      .send({ status: "REJECTED", reason: "Fraudulent document", override: true });

    expect(res.status).toBe(200);

    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, claimantId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });
});

// ── 6. Owner-contest-claims excludes acted-upon claims ────────────────────────
describe("GET /api/businesses/owner-contest-claims", () => {
  it("returns 401 when not logged in", async () => {
    const res = await request(app).get("/api/businesses/owner-contest-claims");
    expect(res.status).toBe(401);
  });

  it("returns only claims with a future contestDeadline", async () => {
    const futureDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const pastDeadline = new Date(Date.now() - 1000);

    const [active] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_OWNER_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline: futureDeadline,
    }).returning();

    const [expired] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_OWNER_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline: pastDeadline,
    }).returning();

    const res = await request(app)
      .get("/api/businesses/owner-contest-claims")
      .set("Cookie", ownerCookie);

    expect(res.status).toBe(200);
    const ids = (res.body as { id: number }[]).map((c) => c.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(expired.id);

    await db.delete(claimsTable).where(eq(claimsTable.id, active.id));
    await db.delete(claimsTable).where(eq(claimsTable.id, expired.id));
  });

  it("drops a claim after owner contests (contestDeadline set to null)", async () => {
    const contestDeadline = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const [claim] = await db.insert(claimsTable).values({
      businessId: ownedBusinessId!,
      userId: claimantId,
      status: "PENDING_OWNER_REVIEW",
      claimantEmail: CLAIMANT_EMAIL,
      contestDeadline,
    }).returning();

    // Owner contests
    await request(app)
      .post(`/api/businesses/${ownedBusinessId}/claim/owner-decision`)
      .set("Cookie", ownerCookie)
      .send({ decision: "contest" });

    // Should no longer appear in the list
    const res = await request(app)
      .get("/api/businesses/owner-contest-claims")
      .set("Cookie", ownerCookie);

    expect(res.status).toBe(200);
    const ids = (res.body as { id: number }[]).map((c) => c.id);
    expect(ids).not.toContain(claim.id);

    await db.delete(claimAuditLogsTable).where(eq(claimAuditLogsTable.actorUserId, claimantId));
    await db.delete(claimsTable).where(eq(claimsTable.id, claim.id));
  });
});
