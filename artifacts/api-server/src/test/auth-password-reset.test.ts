import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  beforeEach,
  vi,
} from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";

// Mock the mailer so tests never hit the real Resend API. Every exported
// sender becomes a no-op vi.fn(); individual tests override behaviour as needed.
vi.mock("../lib/mailer.js", () => ({
  sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
  sendAdminAlert: vi.fn().mockResolvedValue(undefined),
  sendListingApprovedEmail: vi.fn().mockResolvedValue(undefined),
  sendListingRejectedEmail: vi.fn().mockResolvedValue(undefined),
}));

import app from "../app";
import { sendPasswordResetEmail } from "../lib/mailer.js";
import {
  db,
  pool,
  usersTable,
  passwordResetTokensTable,
} from "@workspace/db";

const mockedSendReset = vi.mocked(sendPasswordResetEmail);

const TEST_EMAIL = `pwreset-test-${Date.now()}@example.com`;
const ORIGINAL_PASSWORD = "original-pass-123";
const NONEXISTENT_EMAIL = `nope-${Date.now()}@example.com`;

let testUserId: number;

// Pull the reset token out of the URL the mailer was last called with.
function lastResetToken(): string {
  expect(mockedSendReset).toHaveBeenCalled();
  const lastCall = mockedSendReset.mock.calls.at(-1);
  const resetUrl = lastCall?.[1] ?? "";
  const match = resetUrl.match(/token=([a-f0-9]+)/);
  expect(match, `no token found in reset url: ${resetUrl}`).toBeTruthy();
  return match![1];
}

async function seedUser(): Promise<void> {
  const hash = await bcrypt.hash(ORIGINAL_PASSWORD, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email: TEST_EMAIL, passwordHash: hash, role: "business" })
    .returning();
  testUserId = user.id;
}

async function cleanup(): Promise<void> {
  if (testUserId) {
    await db
      .delete(passwordResetTokensTable)
      .where(eq(passwordResetTokensTable.userId, testUserId));
    await db.delete(usersTable).where(eq(usersTable.id, testUserId));
  }
}

beforeAll(async () => {
  await cleanup();
  await seedUser();
});

afterAll(async () => {
  await cleanup();
  await pool.end();
});

beforeEach(() => {
  mockedSendReset.mockClear();
  mockedSendReset.mockResolvedValue(undefined);
});

describe("POST /api/auth/forgot-password (anti-enumeration)", () => {
  it("returns 200 {success:true} for an existing account and emails a reset link", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: TEST_EMAIL });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockedSendReset).toHaveBeenCalledTimes(1);
    expect(mockedSendReset.mock.calls[0][0]).toBe(TEST_EMAIL);
  });

  it("returns the same 200 {success:true} for a non-existent account without sending email", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: NONEXISTENT_EMAIL });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    // No user => no email, but the response is indistinguishable from a hit.
    expect(mockedSendReset).not.toHaveBeenCalled();
  });

  it("returns 400 when the email is missing", async () => {
    const res = await request(app).post("/api/auth/forgot-password").send({});
    expect(res.status).toBe(400);
    expect(mockedSendReset).not.toHaveBeenCalled();
  });

  it("still returns 200 {success:true} when the mailer throws (e.g. unverified domain)", async () => {
    mockedSendReset.mockRejectedValueOnce(new Error("Resend error: domain not verified"));

    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: TEST_EMAIL });

    // Delivery failure must not 500 the endpoint or leak via status code.
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(mockedSendReset).toHaveBeenCalledTimes(1);
  });
});

describe("POST /api/auth/reset-password (token consumption)", () => {
  it("consumes a freshly issued token once to set a new password", async () => {
    const newPassword = "brand-new-pass-456";

    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: TEST_EMAIL })
      .expect(200);
    const token = lastResetToken();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });

    // The new password works...
    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: newPassword })
      .expect(200);
    // ...and the old one no longer does.
    await request(app)
      .post("/api/auth/login")
      .send({ email: TEST_EMAIL, password: ORIGINAL_PASSWORD })
      .expect(401);
  });

  it("rejects reuse of an already-consumed token", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: TEST_EMAIL })
      .expect(200);
    const token = lastResetToken();

    // First use succeeds.
    await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "first-use-pass-789" })
      .expect(200);

    // Second use is rejected (single-use enforcement).
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "second-use-pass-000" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects an expired token", async () => {
    const expiredToken = `expired-${Date.now()}`;
    await db.insert(passwordResetTokensTable).values({
      userId: testUserId,
      token: expiredToken,
      expiresAt: new Date(Date.now() - 60 * 1000), // 1 minute in the past
    });

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: expiredToken, newPassword: "expired-attempt-111" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects an invalid / unknown token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "totally-bogus-token", newPassword: "bogus-attempt-222" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });

  it("rejects when the new password is too short", async () => {
    await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: TEST_EMAIL })
      .expect(200);
    const token = lastResetToken();

    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token, newPassword: "123" });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("error");
  });
});
