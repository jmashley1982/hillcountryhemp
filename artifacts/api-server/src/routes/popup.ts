import { Router } from "express";
import { eq } from "drizzle-orm";
import { db, popupAdTable } from "@workspace/db";

const router = Router();

// Public: get active popup
router.get("/popup", async (_req, res): Promise<void> => {
  const [popup] = await db
    .select()
    .from(popupAdTable)
    .where(eq(popupAdTable.id, 1));
  if (!popup) {
    res.json({ id: 1, image_path: null, link_url: null, is_active: 0 });
    return;
  }
  res.json({
    id: popup.id,
    image_path: popup.imagePath,
    link_url: popup.linkUrl,
    is_active: popup.isActive,
  });
});

export default router;
