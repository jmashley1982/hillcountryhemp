import { db, businessesTable } from "@workspace/db";
import { inArray } from "drizzle-orm";
import { logger } from "./lib/logger.js";

const FAKE_NAMES = [
  "Hill Country Hemp Co.",
  "Kerrville Kush Supply",
  "New Braunfels Hemp Market",
  "San Marcos Smoke & Hemp",
  "Boerne CBD & Hemp",
  "Bandera Bud Bar",
  "Seguin Hemp Dispensary",
  "Wimberley Green Leaf",
  "Marble Falls Hemp House",
];

const REAL_BUSINESSES: Array<{
  name: string;
  address: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  description?: string;
  isFeatured?: number;
}> = [
  {
    name: "Viking Vapor & Smoke",
    address: "290 S Business IH 35, New Braunfels, TX 78130",
    street: "290 S Business IH 35",
    city: "New Braunfels",
    state: "TX",
    zip: "78130",
    lat: 29.693432,
    lng: -98.116714,
    phone: "(830) 387-4544",
    website: "https://www.vikingvaporandsmoke.com",
    isFeatured: 1,
  },
  {
    name: "Gruene Vape & Smoke",
    address: "263 Loop 337, New Braunfels, TX 78130",
    street: "263 Loop 337",
    city: "New Braunfels",
    state: "TX",
    zip: "78130",
    lat: 29.7048,
    lng: -98.0973,
    phone: "(830) 387-4005",
    website: "https://www.gruenevapesmoke.com",
  },
  {
    name: "Holy Smokes Vape & Smoke",
    address: "1308 Common St, New Braunfels, TX 78130",
    street: "1308 Common St",
    city: "New Braunfels",
    state: "TX",
    zip: "78130",
    lat: 29.7204,
    lng: -98.1021,
    phone: "(830) 214-0663",
    website: "https://holysmokesstores.com",
  },
  {
    name: "House of Vape",
    address: "820 N Walnut Ave, New Braunfels, TX 78130",
    street: "820 N Walnut Ave",
    city: "New Braunfels",
    state: "TX",
    zip: "78130",
    lat: 29.702486,
    lng: -98.13969,
    phone: "(830) 387-4381",
    website: "https://houseofvapetx.com",
  },
  {
    name: "SuperNova Smoke & Vape",
    address: "2084 Central Plaza, New Braunfels, TX 78130",
    street: "2084 Central Plaza",
    city: "New Braunfels",
    state: "TX",
    zip: "78130",
    lat: 29.7183,
    lng: -98.0745,
    phone: "(830) 609-9761",
    website: "https://supernovasmokeshop.com",
  },
  {
    name: "Amsterdam Smoke Shop",
    address: "990 S Seguin Ave, New Braunfels, TX 78130",
    street: "990 S Seguin Ave",
    city: "New Braunfels",
    state: "TX",
    zip: "78130",
    lat: 29.6949,
    lng: -98.1129,
    phone: "(830) 625-2399",
    website: "https://www.amsterdamsmokeshopsa.com",
  },
  {
    name: "ZAR Wellness",
    address: "1928 State Highway 46 W, New Braunfels, TX 78132",
    street: "1928 State Highway 46 W",
    city: "New Braunfels",
    state: "TX",
    zip: "78132",
    lat: 29.7197,
    lng: -98.1651,
    phone: "(210) 627-3664",
    website: "https://zarwellness.com",
    description:
      "Veteran-owned hemp cannabis business. Active military and veterans receive 22% off. Carries Delta 8, Delta 9, edibles, tinctures, topicals, and pet products. 21+ only.",
  },
  {
    name: "Green Herbal Care Vape & Hemp",
    address: "200 Springtown Way, San Marcos, TX 78666",
    street: "200 Springtown Way",
    city: "San Marcos",
    state: "TX",
    zip: "78666",
    lat: 29.8865,
    lng: -97.9222,
    phone: "(737) 221-8999",
    website: "https://greenherbalcare.com",
    description:
      "Full-service hemp dispensary carrying CBD, CBG, Delta-8, Delta-9, and THCA products including edibles, flower, vapes, and topicals. Lab results available for all products.",
  },
  {
    name: "Texas Hill Country Vape and Smoke",
    address: "119 E Hopkins St, San Marcos, TX 78666",
    street: "119 E Hopkins St",
    city: "San Marcos",
    state: "TX",
    zip: "78666",
    lat: 29.883156,
    lng: -97.94108,
    phone: "(512) 291-3997",
    website: "https://www.texashillcountryvapeandsmoke.com",
    description:
      "Full-service dispensary specializing in federally legal THCA flower, concentrates, and disposables. Also carries a wide selection of glass and accessories.",
  },
  {
    name: "Happy Clouds Smoke Shop",
    address: "210 W San Antonio St, San Marcos, TX 78666",
    street: "210 W San Antonio St",
    city: "San Marcos",
    state: "TX",
    zip: "78666",
    lat: 29.882116,
    lng: -97.94298,
    phone: "(512) 216-6129",
    website: "https://www.happycloudssmokeshop.com",
    description:
      "Located in downtown San Marcos near Texas State University. Features an active dab bar with top brands including Puffco, Stundenglass, Volcano, and Carta.",
  },
  {
    name: "CBD Hemp + Smoke",
    address: "4435 Hwy 123, San Marcos, TX 78666",
    street: "4435 Hwy 123",
    city: "San Marcos",
    state: "TX",
    zip: "78666",
    lat: 29.8258,
    lng: -97.9426,
  },
  {
    name: "Smoke Haus Vape & CBD",
    address: "420 N Austin St, Seguin, TX 78155",
    street: "420 N Austin St",
    city: "Seguin",
    state: "TX",
    zip: "78155",
    lat: 29.5713,
    lng: -97.964745,
    description:
      "Premium vaping and CBD products in a clean, welcoming store. Carries flower, disposable vapes, edibles, Delta 8/9/11 products, and CBD tinctures.",
  },
  {
    name: "Amsterdam Smoke Shop Seguin",
    address: "510 W Court St, Seguin, TX 78155",
    street: "510 W Court St",
    city: "Seguin",
    state: "TX",
    zip: "78155",
    lat: 29.569347,
    lng: -97.97012,
    phone: "(830) 386-0354",
    website: "https://www.amsterdamsmokeshopsa.com",
    description:
      "Original Amsterdam Smoke Shop location, founded 2012. Carries over 2,000 products including tobacco, pipes, cigars, glass, vaporizers, vape juices, and CBD.",
  },
  {
    name: "365 Smoke Vape Shop",
    address: "1419 E Court St, Seguin, TX 78155",
    street: "1419 E Court St",
    city: "Seguin",
    state: "TX",
    zip: "78155",
    lat: 29.569174,
    lng: -97.948524,
    description:
      "Open 24 hours a day, 7 days a week. Comprehensive smoke shop with disposable vapes, glass, and accessories.",
  },
  {
    name: "Budz Vapes",
    address: "17020 S IH-35, Buda, TX 78610",
    street: "17020 S IH-35",
    city: "Buda",
    state: "TX",
    zip: "78610",
    lat: 30.0787,
    lng: -97.8247,
    phone: "(512) 985-8274",
    description:
      "Locally owned and operated vape, smoke, and CBD store. Wide range of flavors, cartridges, and vapes.",
  },
  {
    name: "Nature's Choice CBD & Supplements",
    address: "14015 Ranch Road 12, Wimberley, TX 78676",
    street: "14015 Ranch Road 12",
    city: "Wimberley",
    state: "TX",
    zip: "78676",
    lat: 29.9962,
    lng: -98.0965,
    phone: "(512) 842-3336",
    description:
      "Over 100 uniquely formulated CBD products in store. Local delivery available in the Wimberley area.",
  },
  {
    name: "Texas Hill Country Vape and Smoke Wimberley",
    address: "14201 Ranch Road 12, Wimberley, TX 78676",
    street: "14201 Ranch Road 12",
    city: "Wimberley",
    state: "TX",
    zip: "78676",
    lat: 29.998678,
    lng: -98.10065,
    description:
      "THCA flower, concentrates, and disposables alongside a full vape and smoke shop selection. One of 6 Central Texas locations.",
  },
  {
    name: "Gruene Vape & Smoke Canyon Lake",
    address: "8565 FM 2673, Canyon Lake, TX 78133",
    street: "8565 FM 2673",
    city: "Canyon Lake",
    state: "TX",
    zip: "78133",
    lat: 29.8882,
    lng: -98.2207,
    website: "https://www.gruenevapesmoke.com",
    description:
      "Canyon Lake location of Gruene Vape & Smoke. Vapes, Delta 8/9, gummies, flower, kratom, cigars, and hemp wraps.",
  },
];

export async function seedRealBusinesses(): Promise<void> {
  const fakeRows = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(inArray(businessesTable.name, FAKE_NAMES));

  if (fakeRows.length === 0) {
    logger.info("seedRealBusinesses: no fake businesses found, skipping");
    return;
  }

  logger.info(
    { count: fakeRows.length },
    "seedRealBusinesses: removing fake businesses",
  );
  await db.delete(businessesTable).where(
    inArray(
      businessesTable.id,
      fakeRows.map((r) => r.id),
    ),
  );

  const existing = await db
    .select({ name: businessesTable.name })
    .from(businessesTable);
  const existingNames = new Set(existing.map((r) => r.name));

  const toInsert = REAL_BUSINESSES.filter((b) => !existingNames.has(b.name));
  if (toInsert.length === 0) {
    logger.info("seedRealBusinesses: all real businesses already present");
    return;
  }

  await db.insert(businessesTable).values(
    toInsert.map((b) => ({
      ownerId: null,
      name: b.name,
      address: b.address,
      street: b.street,
      city: b.city,
      state: b.state,
      zip: b.zip,
      lat: b.lat,
      lng: b.lng,
      phone: b.phone ?? null,
      website: b.website ?? null,
      description: b.description ?? null,
      hours: null,
      hoursJson: null,
      instagram: null,
      facebook: null,
      googleReviewsUrl: null,
      onSiteSmokingArea: 0,
      status: "approved" as const,
      isFeatured: b.isFeatured ?? 0,
    })),
  );

  logger.info(
    { count: toInsert.length },
    "seedRealBusinesses: inserted real businesses",
  );
}
