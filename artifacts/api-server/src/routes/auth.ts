import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

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

export default router;
