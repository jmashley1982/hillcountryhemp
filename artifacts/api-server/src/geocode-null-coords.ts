import { isNull, or, eq, and } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import { logger } from "./lib/logger.js";

/**
 * Authoritative coordinate overrides for businesses where Nominatim returned
 * wrong results. Applied unconditionally on startup so manual data-fix SQL is
 * not needed in production.
 */
const COORD_OVERRIDES: Array<{ id: number; lat: number; lng: number; name: string }> = [
  // Nominatim geocoded the Business IH-35 address to the wrong spot.
  // Correct coordinates sourced from Google Maps (@29.693431,-98.1161716).
  { id: 1, lat: 29.693431, lng: -98.116716, name: "Viking Vapor & Smoke" },
];

/**
 * Apply hard-coded coordinate overrides and log current coordinates so
 * regressions are visible in server logs.
 */
export async function applyCoordOverrides(): Promise<void> {
  for (const override of COORD_OVERRIDES) {
    await db
      .update(businessesTable)
      .set({ lat: override.lat, lng: override.lng })
      .where(eq(businessesTable.id, override.id));

    const [row] = await db
      .select({ lat: businessesTable.lat, lng: businessesTable.lng })
      .from(businessesTable)
      .where(eq(businessesTable.id, override.id));

    logger.info(
      { id: override.id, name: override.name, lat: row?.lat, lng: row?.lng },
      "applyCoordOverrides: coordinates confirmed",
    );
  }
}

async function geocode(
  address: string,
): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "THCHempFinder/1.0" },
    });
    const data = (await resp.json()) as Array<{ lat: string; lon: string }>;
    if (data.length > 0)
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch (err) {
    logger.warn({ err }, "Nominatim geocode request failed");
  }
  return null;
}

/**
 * Re-geocode approved businesses that have null lat/lng.
 * Must run after applyCoordOverrides so override businesses are never
 * accidentally cleared by a Nominatim failure.
 */
export async function geocodeNullCoords(): Promise<void> {
  const overrideIds = new Set(COORD_OVERRIDES.map((o) => o.id));

  const rows = await db
    .select({
      id: businessesTable.id,
      address: businessesTable.address,
      name: businessesTable.name,
    })
    .from(businessesTable)
    .where(
      and(
        eq(businessesTable.status, "approved"),
        or(isNull(businessesTable.lat), isNull(businessesTable.lng)),
      ),
    );

  const toGeocode = rows.filter((r) => !overrideIds.has(r.id));

  if (toGeocode.length === 0) {
    logger.info("geocodeNullCoords: no approved businesses with missing coordinates");
    return;
  }

  logger.info(
    { count: toGeocode.length },
    "geocodeNullCoords: geocoding approved businesses with null coordinates",
  );

  for (const row of toGeocode) {
    const coords = await geocode(row.address);
    if (coords) {
      await db
        .update(businessesTable)
        .set({ lat: coords.lat, lng: coords.lng })
        .where(eq(businessesTable.id, row.id));
      logger.info(
        { id: row.id, name: row.name, lat: coords.lat, lng: coords.lng },
        "geocodeNullCoords: coordinates set",
      );
    } else {
      logger.warn(
        { id: row.id, name: row.name, address: row.address },
        "geocodeNullCoords: geocoding failed for business",
      );
    }
  }
}
