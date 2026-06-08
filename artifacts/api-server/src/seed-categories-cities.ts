import { db } from "@workspace/db";
import { categoriesTable, citiesTable } from "@workspace/db/schema";
import { logger } from "./lib/logger.js";

const DEFAULT_CATEGORIES = [
  "Flower",
  "Pre-Rolls",
  "Concentrates",
  "Edibles",
  "Drinks",
  "Topicals",
  "CBD Products",
  "Bongs/Pipes",
  "Cones/Papers",
  "Lighters/Torches",
  "Batteries/E-Devices",
  "Mushrooms",
  "Pet",
  "Novelty",
];

const DEFAULT_CITIES = [
  "Austin",
  "Boerne",
  "Buda",
  "Bulverde",
  "Canyon Lake",
  "Cedar Park",
  "Cibolo",
  "Converse",
  "Dripping Springs",
  "Fredericksburg",
  "Garden Ridge",
  "Georgetown",
  "Kerrville",
  "Kyle",
  "Live Oak",
  "Marble Falls",
  "New Braunfels",
  "Pflugerville",
  "Round Rock",
  "San Antonio",
  "San Marcos",
  "Schertz",
  "Seguin",
  "Universal City",
  "Wimberley",
];

export async function seedCategoriesCities(): Promise<void> {
  const [existingCat] = await db.select().from(categoriesTable).limit(1);
  if (!existingCat) {
    await db
      .insert(categoriesTable)
      .values(DEFAULT_CATEGORIES.map((name) => ({ name })))
      .onConflictDoNothing();
    logger.info("Seeded default product categories");
  }

  const [existingCity] = await db.select().from(citiesTable).limit(1);
  if (!existingCity) {
    await db
      .insert(citiesTable)
      .values(DEFAULT_CITIES.map((name) => ({ name })))
      .onConflictDoNothing();
    logger.info("Seeded default cities");
  }
}
