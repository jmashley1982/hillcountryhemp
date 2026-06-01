import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import { logger } from "./lib/logger.js";

export async function seedAdmin(): Promise<void> {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    logger.info("ADMIN_EMAIL/ADMIN_PASSWORD not set — skipping admin seed");
    return;
  }
  const [existing] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email));
  if (existing) {
    if (existing.role !== "admin") {
      await db
        .update(usersTable)
        .set({ role: "admin" })
        .where(eq(usersTable.id, existing.id));
      logger.info({ email }, "Promoted existing user to admin");
    } else {
      logger.info({ email }, "Admin already exists — skipping");
    }
    return;
  }
  const hash = await bcrypt.hash(password, 10);
  await db
    .insert(usersTable)
    .values({ email, passwordHash: hash, role: "admin" });
  logger.info({ email }, "Admin user created");
}
