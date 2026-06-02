import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import router from "./routes";
import { logger } from "./lib/logger";
import { pool } from "@workspace/db";
import { streamFromGCS } from "./lib/gcs.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PgSession = ConnectPgSimple(session);

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);

app.use(
  cors({
    origin: true,
    credentials: true,
  }),
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  session({
    store: new PgSession({
      pool,
      tableName: "session",
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET ?? "fallback_dev_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24,
      httpOnly: true,
      secure: false,
    },
  }),
);

// Serve uploaded files — local disk first (dev), then GCS (production)
const uploadsDir = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
app.use("/api/uploads", (req, res, next) => {
  const filename = req.path.replace(/^\//, "");
  if (!filename) { next(); return; }
  const localPath = path.join(uploadsDir, filename);
  if (fs.existsSync(localPath)) {
    res.sendFile(localPath);
    return;
  }
  streamFromGCS(filename, res).then((served) => {
    if (!served) res.status(404).json({ error: "Not found" });
  }).catch(() => res.status(404).json({ error: "Not found" }));
});

app.use("/api", router);

export default app;
