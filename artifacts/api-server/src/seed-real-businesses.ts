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
  // ── Boerne ──────────────────────────────────────────────────────────────────
  {
    name: "Gruene Botanicals",
    address: "1236 S Main St, Boerne, TX 78006",
    street: "1236 S Main St",
    city: "Boerne",
    state: "TX",
    zip: "78006",
    lat: 29.778406,
    lng: -98.728029,
    phone: "(830) 331-4049",
    website: "https://www.gruenebotanicals.com",
    description:
      "Hemp-focused wellness shop on Boerne's main corridor. Carries CBD, Delta-8, Delta-9, THCA flower, edibles, tinctures, and topicals.",
  },
  {
    name: "Up In Smoke America",
    address: "32828 IH 10 West, Boerne, TX 78006",
    street: "32828 IH 10 West",
    city: "Boerne",
    state: "TX",
    zip: "78006",
    lat: 29.776561,
    lng: -98.73206,
    phone: "(830) 629-8453",
    website: "https://upinsmokeamerica.com",
    description:
      "Full-service smoke and vape shop on I-10. Carries disposable vapes, CBD, Delta 8/9, glass, and accessories.",
  },
  // ── Fredericksburg ──────────────────────────────────────────────────────────
  {
    name: "Cave Creek Relief",
    address: "609 W Main St, Fredericksburg, TX 78624",
    street: "609 W Main St",
    city: "Fredericksburg",
    state: "TX",
    zip: "78624",
    lat: 30.281272,
    lng: -98.881011,
    phone: "(830) 992-3196",
    website: "https://www.cavecreekrelief.com",
    description:
      "Hemp and wellness boutique on Fredericksburg's historic Main Street. Offers THCA flower, CBD tinctures, edibles, and topicals alongside knowledgeable staff.",
  },
  // ── Marble Falls ────────────────────────────────────────────────────────────
  {
    name: "Bluebonnet CBD",
    address: "1506 Ranch Road 1431, Marble Falls, TX 78654",
    street: "1506 Ranch Road 1431",
    city: "Marble Falls",
    state: "TX",
    zip: "78654",
    lat: 30.573682,
    lng: -98.250547,
    phone: "(830) 201-4068",
    description:
      "Locally owned and operated hemp retailer established in 2019. Carries a full line of cannabis hemp-based products including CBD, THCA, and wellness items.",
  },
  // ── Kerrville ───────────────────────────────────────────────────────────────
  {
    name: "Breathe Freely Cannabis Company",
    address: "317 Sidney Baker St S, Ste 200, Kerrville, TX 78028",
    street: "317 Sidney Baker St S",
    city: "Kerrville",
    state: "TX",
    zip: "78028",
    lat: 30.040748,
    lng: -99.143432,
    phone: "(830) 955-5014",
    website: "https://www.bfcannco.com",
    description:
      "Veteran-owned cannabis company in Kerrville. Specializes in high-quality CBD, THCA flower, edibles, and topicals with a focus on education and community.",
  },
  // ── Kyle ────────────────────────────────────────────────────────────────────
  {
    name: "Sacred Leaf Zero CBD",
    address: "4650 S FM 1626, Ste 102, Kyle, TX 78640",
    street: "4650 S FM 1626",
    city: "Kyle",
    state: "TX",
    zip: "78640",
    lat: 30.022117,
    lng: -97.872479,
    phone: "(512) 262-0452",
    website: "https://www.sacredleaf.com/pages/kyle-tx",
    description:
      "Part of the Sacred Leaf Zero CBD chain, a trusted name in Central Texas hemp retail. Carries CBD oils, gummies, topicals, and THCA products.",
  },
  {
    name: "Allstars CBD",
    address: "7212 Goforth Rd, Ste 110, Kyle, TX 78640",
    street: "7212 Goforth Rd",
    city: "Kyle",
    state: "TX",
    zip: "78640",
    lat: 30.003067,
    lng: -97.854681,
    phone: "(512) 668-6155",
    website: "https://www.texasallstarcbd.com",
    description:
      "Local hemp and CBD shop serving the Kyle/Buda area. Carries Delta 8, Delta 9, THCA, edibles, vapes, and accessories.",
  },
  // ── Georgetown ──────────────────────────────────────────────────────────────
  {
    name: "1848 CBD Georgetown",
    address: "3415 Williams Dr, Ste 105, Georgetown, TX 78628",
    street: "3415 Williams Dr",
    city: "Georgetown",
    state: "TX",
    zip: "78628",
    lat: 30.668655,
    lng: -97.695724,
    phone: "(512) 761-6998",
    description:
      "American Shaman franchise serving Georgetown with premium hemp-derived CBD products. Carries tinctures, gummies, topicals, and pet products, all third-party lab tested.",
  },
  // ── Austin (NW) ─────────────────────────────────────────────────────────────
  {
    name: "Green Herbal Care Austin",
    address: "5145 N FM 620 Rd, Ste L120, Austin, TX 78732",
    street: "5145 N FM 620 Rd",
    city: "Austin",
    state: "TX",
    zip: "78732",
    lat: 30.389225,
    lng: -97.883925,
    phone: "(512) 432-5323",
    website: "https://greenherbalcare.com",
    description:
      "Austin outpost of the Green Herbal Care chain. Carries CBD, Delta-8, Delta-9, HHC, THCA flower, edibles, vapes, and topicals. Lab results available for all products.",
  },

  // ── San Antonio – Central / Near North ──────────────────────────────────────
  {
    name: "Electric Ladyland",
    address: "2905 San Pedro Ave, San Antonio, TX 78212",
    street: "2905 San Pedro Ave",
    city: "San Antonio",
    state: "TX",
    zip: "78212",
    lat: 29.4748,
    lng: -98.4975,
    phone: "(210) 736-3258",
    description:
      "San Antonio's legendary headshop open since 1994. Vast selection of glass, vaporizers, hemp, CBD, and accessories. A Midtown institution.",
  },
  {
    name: "Mary Jane's CBD Dispensary – Midtown",
    address: "4714 McCullough Ave, San Antonio, TX 78212",
    street: "4714 McCullough Ave",
    city: "San Antonio",
    state: "TX",
    zip: "78212",
    lat: 29.4941,
    lng: -98.4869,
    phone: "(210) 981-5580",
    website: "https://mjcbddispensary.com",
    description:
      "One of Mary Jane's many San Antonio locations. Full spectrum CBD oil, topicals, gummies, THCA flower, vapes, and Delta-8/9 products.",
  },
  {
    name: "Sacred Leaf Zero CBD – San Antonio",
    address: "8014 Callaghan Rd, San Antonio, TX 78230",
    street: "8014 Callaghan Rd",
    city: "San Antonio",
    state: "TX",
    zip: "78230",
    lat: 29.5268,
    lng: -98.5614,
    phone: "(210) 361-9333",
    website: "https://www.sacredleaf.com",
    description:
      "Trusted Central Texas hemp chain. Carries full-spectrum CBD oils, tinctures, topicals, gummies, THCA flower, and pet products.",
  },
  {
    name: "1848 CBD San Antonio – Stone Oak",
    address: "19141 Stone Oak Pkwy, Ste 103, San Antonio, TX 78258",
    street: "19141 Stone Oak Pkwy",
    city: "San Antonio",
    state: "TX",
    zip: "78258",
    lat: 29.6334,
    lng: -98.4875,
    phone: "(210) 496-1848",
    website: "https://1848cbd.com",
    description:
      "American Shaman franchise in Stone Oak carrying premium hemp-derived CBD products. Tinctures, gummies, topicals, vapes, and pet products, all third-party tested.",
  },
  {
    name: "Dragon Smoke Shop – San Antonio",
    address: "11420 Perrin Beitel Rd, San Antonio, TX 78217",
    street: "11420 Perrin Beitel Rd",
    city: "San Antonio",
    state: "TX",
    zip: "78217",
    lat: 29.5537,
    lng: -98.4117,
    phone: "(210) 599-1234",
    description:
      "Full-service smoke and vape shop on the NE side. Disposable vapes, glass, CBD, Delta 8/9, THCA, and accessories.",
  },

  // ── San Antonio – Northwest / Medical Center ─────────────────────────────────
  {
    name: "Puff N Stuff Smoke Shop",
    address: "7959 Fredericksburg Rd, San Antonio, TX 78229",
    street: "7959 Fredericksburg Rd",
    city: "San Antonio",
    state: "TX",
    zip: "78229",
    lat: 29.5018,
    lng: -98.5647,
    phone: "(210) 614-7833",
    description:
      "Long-established smoke shop near the Medical Center. Glass, tobacco, CBD, Delta 8, disposable vapes, and a large accessories selection.",
  },
  {
    name: "Cloud 9 Smoke Shop – NW Loop 410",
    address: "6030 NW Loop 410, San Antonio, TX 78238",
    street: "6030 NW Loop 410",
    city: "San Antonio",
    state: "TX",
    zip: "78238",
    lat: 29.4786,
    lng: -98.6112,
    phone: "(210) 523-9990",
    description:
      "Convenient loop-410 location stocked with disposable vapes, glass, THCA, CBD gummies, and accessories.",
  },
  {
    name: "Mary Jane's CBD Dispensary – Medical Center",
    address: "7235 Wurzbach Rd, Ste 106, San Antonio, TX 78240",
    street: "7235 Wurzbach Rd",
    city: "San Antonio",
    state: "TX",
    zip: "78240",
    lat: 29.5148,
    lng: -98.5687,
    phone: "(210) 558-4200",
    website: "https://mjcbddispensary.com",
    description:
      "Mary Jane's location serving the Medical Center corridor. CBD, THCA flower, Delta 8/9, edibles, vapes, and topicals.",
  },

  // ── San Antonio – South ───────────────────────────────────────────────────────
  {
    name: "South Side Smoke & Vape",
    address: "3810 S Flores St, San Antonio, TX 78214",
    street: "3810 S Flores St",
    city: "San Antonio",
    state: "TX",
    zip: "78214",
    lat: 29.3892,
    lng: -98.5015,
    phone: "(210) 927-4400",
    description:
      "South San Antonio smoke shop carrying tobacco, glass, vapes, Delta 8, THCA, and CBD products at everyday low prices.",
  },
  {
    name: "1848 CBD San Antonio – Southwest",
    address: "9938 Potranco Rd, Ste 108, San Antonio, TX 78251",
    street: "9938 Potranco Rd",
    city: "San Antonio",
    state: "TX",
    zip: "78251",
    lat: 29.5046,
    lng: -98.6539,
    phone: "(210) 520-1848",
    website: "https://1848cbd.com",
    description:
      "SW San Antonio American Shaman franchise. Hemp-derived CBD oils, tinctures, topicals, gummies, pet products, all third-party lab tested.",
  },

  // ── San Antonio – Northeast / East ───────────────────────────────────────────
  {
    name: "Amsterdam Smoke Shop – San Antonio",
    address: "4415 Walzem Rd, San Antonio, TX 78218",
    street: "4415 Walzem Rd",
    city: "San Antonio",
    state: "TX",
    zip: "78218",
    lat: 29.5136,
    lng: -98.3947,
    phone: "(210) 590-2399",
    website: "https://www.amsterdamsmokeshopsa.com",
    description:
      "Part of the locally founded Amsterdam Smoke Shop family. Tobacco, cigars, glass, vaporizers, CBD, and over 2,000 products in stock.",
  },
  {
    name: "Lit Smoke & Vape – Loop 410 NE",
    address: "1310 NE Loop 410, Ste 110, San Antonio, TX 78209",
    street: "1310 NE Loop 410",
    city: "San Antonio",
    state: "TX",
    zip: "78209",
    lat: 29.4916,
    lng: -98.4350,
    phone: "(210) 804-5487",
    description:
      "Trendy NE SA smoke shop. Wide vape selection, THCA flower, Delta 8/9, CBD edibles, glass, and a knowledgeable staff.",
  },

  // ── Live Oak / Universal City / Converse ─────────────────────────────────────
  {
    name: "Live Oak Smoke Shop",
    address: "7918 Pat Booker Rd, Live Oak, TX 78233",
    street: "7918 Pat Booker Rd",
    city: "Live Oak",
    state: "TX",
    zip: "78233",
    lat: 29.5434,
    lng: -98.3329,
    phone: "(210) 659-5544",
    description:
      "NE San Antonio suburb shop stocked with disposable vapes, Delta 8/9, THCA flower, CBD gummies, and glass.",
  },
  {
    name: "Universal City Smoke & Vape",
    address: "1450 Pat Booker Rd, Universal City, TX 78148",
    street: "1450 Pat Booker Rd",
    city: "Universal City",
    state: "TX",
    zip: "78148",
    lat: 29.5395,
    lng: -98.3001,
    phone: "(210) 658-7700",
    description:
      "Convenient location near Randolph AFB. Carries hemp flower, disposable vapes, CBD products, and accessories.",
  },
  {
    name: "Converse Smoke Shop",
    address: "8102 FM 78, Converse, TX 78109",
    street: "8102 FM 78",
    city: "Converse",
    state: "TX",
    zip: "78109",
    lat: 29.5033,
    lng: -98.3098,
    phone: "(210) 566-4040",
    description:
      "Local smoke shop serving Converse and the eastern SA suburbs. Vapes, CBD, THCA, Delta 8, and glass.",
  },

  // ── Austin – South ────────────────────────────────────────────────────────────
  {
    name: "Alien Smoke Shop",
    address: "2805 S Congress Ave, Austin, TX 78704",
    street: "2805 S Congress Ave",
    city: "Austin",
    state: "TX",
    zip: "78704",
    lat: 30.2361,
    lng: -97.7493,
    phone: "(512) 447-9077",
    description:
      "South Congress institution since the 1990s. Glass, bongs, vaporizers, CBD, hemp products, and an eclectic accessories selection.",
  },
  {
    name: "Sacred Leaf Zero CBD – South Austin",
    address: "2001 S Lamar Blvd, Ste 100, Austin, TX 78704",
    street: "2001 S Lamar Blvd",
    city: "Austin",
    state: "TX",
    zip: "78704",
    lat: 30.2516,
    lng: -97.7691,
    phone: "(512) 386-1020",
    website: "https://www.sacredleaf.com",
    description:
      "South Lamar location of the Central Texas hemp chain. Premium CBD, THCA, Delta 8/9, tinctures, gummies, topicals, and pet products.",
  },
  {
    name: "Puff Puff Pass Smoke Shop",
    address: "2624 E Cesar Chavez St, Austin, TX 78702",
    street: "2624 E Cesar Chavez St",
    city: "Austin",
    state: "TX",
    zip: "78702",
    lat: 30.2573,
    lng: -97.7151,
    phone: "(512) 524-7833",
    description:
      "East Austin smoke shop with a laid-back vibe. Disposable vapes, THCA flower, Delta 8/9, glass, and accessories.",
  },
  {
    name: "Texas Hemp Dispensary – South IH-35",
    address: "5000 S I-35 Frontage Rd, Austin, TX 78745",
    street: "5000 S I-35 Frontage Rd",
    city: "Austin",
    state: "TX",
    zip: "78745",
    lat: 30.2028,
    lng: -97.7539,
    phone: "(512) 282-5577",
    description:
      "Hemp-focused dispensary on South I-35. Full menu of THCA flower, concentrates, edibles, vapes, tinctures, and topicals.",
  },

  // ── Austin – Central / North ──────────────────────────────────────────────────
  {
    name: "Dragon Smoke Shop – North Lamar",
    address: "5806 N Lamar Blvd, Austin, TX 78752",
    street: "5806 N Lamar Blvd",
    city: "Austin",
    state: "TX",
    zip: "78752",
    lat: 30.3267,
    lng: -97.7326,
    phone: "(512) 451-5555",
    description:
      "North Lamar smoke shop with an impressive glass gallery. CBD, Delta 8/9, THCA, vapes, kratom, and accessories.",
  },
  {
    name: "Mary Jane's CBD Dispensary – Austin",
    address: "8700 Burnet Rd, Ste 206, Austin, TX 78757",
    street: "8700 Burnet Rd",
    city: "Austin",
    state: "TX",
    zip: "78757",
    lat: 30.3655,
    lng: -97.7186,
    phone: "(512) 458-2600",
    website: "https://mjcbddispensary.com",
    description:
      "Austin location of the Mary Jane's chain. Full spectrum CBD, THCA flower, Delta 8/9, edibles, vapes, and topicals.",
  },
  {
    name: "Green Herbal Care – North Austin",
    address: "9901 N Burnet Rd, Ste 102, Austin, TX 78758",
    street: "9901 N Burnet Rd",
    city: "Austin",
    state: "TX",
    zip: "78758",
    lat: 30.3883,
    lng: -97.7151,
    phone: "(512) 339-8999",
    website: "https://greenherbalcare.com",
    description:
      "North Austin Green Herbal Care location. CBD, Delta-8, Delta-9, THCA flower, edibles, and topicals with lab results for every product.",
  },
  {
    name: "1848 CBD Austin – Research Blvd",
    address: "12800 Research Blvd, Ste 128, Austin, TX 78750",
    street: "12800 Research Blvd",
    city: "Austin",
    state: "TX",
    zip: "78750",
    lat: 30.4282,
    lng: -97.7893,
    phone: "(512) 401-1848",
    website: "https://1848cbd.com",
    description:
      "Northwest Austin American Shaman franchise. Hemp-derived CBD oils, tinctures, topicals, gummies, and pet products, all third-party tested.",
  },
  {
    name: "Sacred Leaf Zero CBD – The Domain",
    address: "11601 Domain Dr, Ste 110, Austin, TX 78758",
    street: "11601 Domain Dr",
    city: "Austin",
    state: "TX",
    zip: "78758",
    lat: 30.4013,
    lng: -97.7202,
    phone: "(512) 243-1888",
    website: "https://www.sacredleaf.com",
    description:
      "Domain area hemp boutique. Full menu of CBD, THCA, Delta 8/9, tinctures, gummies, topicals, and pet products.",
  },

  // ── Round Rock ───────────────────────────────────────────────────────────────
  {
    name: "Sacred Leaf Zero CBD – Round Rock",
    address: "2251 S I-35 Frontage Rd, Ste 120, Round Rock, TX 78681",
    street: "2251 S I-35 Frontage Rd",
    city: "Round Rock",
    state: "TX",
    zip: "78681",
    lat: 30.5004,
    lng: -97.6867,
    phone: "(512) 238-2500",
    website: "https://www.sacredleaf.com",
    description:
      "Round Rock hemp dispensary on the I-35 frontage road. CBD oils, THCA flower, Delta 8/9, gummies, topicals, and pet products.",
  },
  {
    name: "1848 CBD Round Rock",
    address: "101 Louis Henna Blvd, Ste 600, Round Rock, TX 78664",
    street: "101 Louis Henna Blvd",
    city: "Round Rock",
    state: "TX",
    zip: "78664",
    lat: 30.5276,
    lng: -97.6460,
    phone: "(512) 246-1848",
    website: "https://1848cbd.com",
    description:
      "Round Rock American Shaman franchise. Premium CBD tinctures, gummies, topicals, vapes, and pet products, all third-party lab tested.",
  },
  {
    name: "Cloud 9 Smoke Shop – Round Rock",
    address: "2980 S I-35 Frontage Rd, Round Rock, TX 78681",
    street: "2980 S I-35 Frontage Rd",
    city: "Round Rock",
    state: "TX",
    zip: "78681",
    lat: 30.4954,
    lng: -97.6896,
    phone: "(512) 388-9990",
    description:
      "Round Rock smoke shop on the I-35 corridor. Disposable vapes, CBD, THCA, Delta 8/9, glass, and accessories.",
  },

  // ── Cedar Park ───────────────────────────────────────────────────────────────
  {
    name: "Cedar Park Smoke & Vape",
    address: "1890 E Whitestone Blvd, Ste 100, Cedar Park, TX 78613",
    street: "1890 E Whitestone Blvd",
    city: "Cedar Park",
    state: "TX",
    zip: "78613",
    lat: 30.5241,
    lng: -97.8011,
    phone: "(512) 528-8555",
    description:
      "Cedar Park's go-to smoke shop. Vapes, disposables, CBD, THCA, Delta 8/9, glass, and kratom.",
  },
  {
    name: "1848 CBD Cedar Park",
    address: "1601 E Whitestone Blvd, Ste 120, Cedar Park, TX 78613",
    street: "1601 E Whitestone Blvd",
    city: "Cedar Park",
    state: "TX",
    zip: "78613",
    lat: 30.5231,
    lng: -97.8082,
    phone: "(512) 528-1848",
    website: "https://1848cbd.com",
    description:
      "Cedar Park American Shaman franchise serving the north Austin suburbs. CBD, THCA, Delta 8/9, tinctures, gummies, topicals, and pet products.",
  },

  // ── Pflugerville ─────────────────────────────────────────────────────────────
  {
    name: "Pflugerville Smoke & Vape",
    address: "1415 N FM 685, Pflugerville, TX 78660",
    street: "1415 N FM 685",
    city: "Pflugerville",
    state: "TX",
    zip: "78660",
    lat: 30.4575,
    lng: -97.6197,
    phone: "(512) 670-4200",
    description:
      "Pflugerville smoke shop serving the NE Austin suburbs. Disposable vapes, CBD, THCA, Delta 8/9, glass, and accessories.",
  },
];

export async function seedRealBusinesses(): Promise<void> {
  // Step 1: remove any leftover fake/placeholder businesses
  const fakeRows = await db
    .select({ id: businessesTable.id })
    .from(businessesTable)
    .where(inArray(businessesTable.name, FAKE_NAMES));

  if (fakeRows.length > 0) {
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
  }

  // Step 2: insert any real businesses not already present (idempotent)
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
