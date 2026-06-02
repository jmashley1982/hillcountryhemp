import { isNull, or, eq } from "drizzle-orm";
import { db, businessesTable } from "@workspace/db";
import { logger } from "./lib/logger.js";

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

export async function geocodeNullCoords(): Promise<void> {
  const rows = await db
    .select({
      id: businessesTable.id,
      address: businessesTable.address,
      name: businessesTable.name,
    })
    .from(businessesTable)
    .where(or(isNull(businessesTable.lat), isNull(businessesTable.lng)));

  if (rows.length === 0) {
    logger.info("geocodeNullCoords: no businesses with missing coordinates");
    return;
  }

  logger.info(
    { count: rows.length },
    "geocodeNullCoords: geocoding businesses with null coordinates",
  );

  for (const row of rows) {
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
