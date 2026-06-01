import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import businessesRouter from "./businesses.js";
import adminRouter from "./admin.js";
import brandsRouter from "./brands.js";
import popupRouter from "./popup.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(businessesRouter);
router.use(adminRouter);
router.use(brandsRouter);
router.use(popupRouter);

export default router;
