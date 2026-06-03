import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "./lib/logger";

export async function migrateAdColumns(): Promise<void> {
  const tables = ["banner_ad", "b2b_banner_ad", "popup_ad"];
  for (const table of tables) {
    await db.execute(
      sql.raw(
        `ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS link_opens_new_tab integer NOT NULL DEFAULT 1`
      )
    );
  }
  logger.info("migrateAdColumns: link_opens_new_tab ensured on all ad tables");
}
