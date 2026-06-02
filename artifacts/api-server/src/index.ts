import app from "./app";
import { logger } from "./lib/logger";
import { seedAdmin } from "./seed-admin";
import { applyCoordOverrides, geocodeNullCoords } from "./geocode-null-coords";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  seedAdmin()
    .then(() => applyCoordOverrides())
    .then(() => geocodeNullCoords())
    .catch((e) => logger.error({ err: e }, "Startup tasks failed"));
});
