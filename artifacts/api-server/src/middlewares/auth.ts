import { type Request, type Response, type NextFunction } from "express";

export function requireLogin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session?.userId) {
    next();
    return;
  }
  res.status(401).json({ error: "Authentication required" });
}

export function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session?.role === "admin") {
    next();
    return;
  }
  res.status(403).json({ error: "Admin access required" });
}

export function requireBusiness(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (req.session?.role === "business") {
    next();
    return;
  }
  res.status(403).json({ error: "Business account required" });
}
