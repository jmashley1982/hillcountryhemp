import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { eq, and, gt, isNull, ne } from "drizzle-orm";
import { db, usersTable, passwordResetTokensTable } from "@workspace/db";
import { sendPasswordResetEmail, sendWelcomeEmail } from "../lib/mailer.js";
import { requireLogin } from "../middlewares/auth.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.post("/auth/register", async (req, res): Promise<void> => {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing) {
    res.status(400).json({ error: "Email already in use" });
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  const [user] = await db
    .insert(usersTable)
    .values({ email, passwordHash: hash, role: "business" })
    .returning();
  req.session.userId = user.id;
  req.session.role = "business";
  res.json({ success: true, userId: user.id, role: "business" });
  // Fire-and-forget welcome email — don't block the response
  sendWelcomeEmail(user.email).catch((err: unknown) => {
    logger.warn({ err, to: user.email }, "Failed to send welcome email");
  });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body as {
    email: string;
    password: string;
  };
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  req.session.userId = user.id;
  req.session.role = user.role;
  res.json({ success: true, userId: user.id, role: user.role });
});

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("connect.sid");
    res.json({ success: true });
  });
});

router.get("/auth/me", async (req, res): Promise<void> => {
  if (!req.session.userId) {
    res.status(401).json({ error: "Not logged in" });
    return;
  }
  const [user] = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      role: usersTable.role,
    })
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId));
  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

// Public: request password reset email (always returns 200 to prevent enumeration)
router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body as { email?: string };
  if (!email?.trim()) {
    res.status(400).json({ error: "Email required" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, email: usersTable.email })
    .from(usersTable)
    .where(eq(usersTable.email, email.trim()));

  if (user) {
    const token = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await db.insert(passwordResetTokensTable).values({
      userId: user.id,
      token,
      expiresAt,
    });

    const domains = process.env.REPLIT_DOMAINS?.split(",")[0] ?? "localhost:80";
    const proto = domains.includes("localhost") ? "http" : "https";
    const basePath = process.env.BASE_PATH ?? "";
    const resetUrl = `${proto}://${domains}${basePath}/reset-password?token=${token}`;

    await sendPasswordResetEmail(user.email, resetUrl);
  }

  // Always respond with success to prevent user enumeration
  res.json({ success: true });
});

// Public: consume token and set new password
router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, newPassword } = req.body as {
    token?: string;
    newPassword?: string;
  };

  if (!token || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Token and a new password (min 6 characters) are required" });
    return;
  }

  const now = new Date();
  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.token, token),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.expiresAt, now),
      ),
    );

  if (!record) {
    res.status(400).json({ error: "This reset link is invalid or has expired. Please request a new one." });
    return;
  }

  const hash = await bcrypt.hash(newPassword, 10);

  await db
    .update(usersTable)
    .set({ passwordHash: hash })
    .where(eq(usersTable.id, record.userId));

  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: now })
    .where(eq(passwordResetTokensTable.id, record.id));

  res.json({ success: true });
});

// Authenticated: change email address
router.put("/auth/email", requireLogin, async (req, res): Promise<void> => {
  const { currentPassword, newEmail } = req.body as {
    currentPassword?: string;
    newEmail?: string;
  };
  if (!currentPassword || !newEmail?.trim()) {
    res.status(400).json({ error: "Current password and new email are required" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const trimmed = newEmail.trim().toLowerCase();
  const [conflict] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.email, trimmed), ne(usersTable.id, user.id)));
  if (conflict) {
    res.status(400).json({ error: "That email address is already in use" });
    return;
  }
  await db.update(usersTable).set({ email: trimmed }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

// Authenticated: change password
router.put("/auth/password", requireLogin, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body as {
    currentPassword?: string;
    newPassword?: string;
  };
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    res.status(400).json({ error: "Current password and a new password (min 6 characters) are required" });
    return;
  }
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!));
  if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }
  const hash = await bcrypt.hash(newPassword, 10);
  await db.update(usersTable).set({ passwordHash: hash }).where(eq(usersTable.id, user.id));
  res.json({ success: true });
});

export default router;
