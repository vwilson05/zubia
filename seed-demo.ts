import db from "./db";

export function seedDemoData() {
  // Idempotency check
  const existingUser = db.query("SELECT id FROM users LIMIT 1").get();
  if (existingUser) {
    console.log("[seed] Demo data already exists, skipping.");
    return;
  }

  console.log("[seed] Seeding demo data...");

  // Create demo user: Trang
  const userResult = db.run(
    `INSERT INTO users (name, email, commute_address, budget_min, budget_max, priorities, bedrooms, bathrooms, pet_friendly, parking, laundry)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      "Trang",
      "trang@example.com",
      "San Francisco Financial District",
      3000,
      4500,
      JSON.stringify([
        { criterion: "commute", weight: 0.35 },
        { criterion: "price", weight: 0.25 },
        { criterion: "safety", weight: 0.2 },
        { criterion: "walkability", weight: 0.1 },
        { criterion: "pet_friendly", weight: 0.1 },
      ]),
      3,
      2,
      1,
      "required",
      "in_unit",
    ]
  );
  const userId = userResult.lastInsertRowid;

  // 6 Bay Area listings
  const listings = [
    {
      url: "https://www.zillow.com/homedetails/123-Castro-St-Mountain-View-CA/example",
      source: "zillow",
      address: "742 Castro Street",
      city: "Mountain View",
      neighborhood: "Downtown Mountain View",
      price: 3800,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1350,
      description:
        "Beautifully updated 3BR/2BA apartment in the heart of Downtown Mountain View. Walking distance to Castro Street shops, restaurants, and Caltrain station. Modern kitchen with quartz countertops, in-unit washer/dryer, one assigned parking spot. Pet-friendly with deposit. Available immediately.",
      pet_policy: "Cats and small dogs allowed with $500 deposit",
      parking: "1 assigned covered spot",
      laundry: "In-unit washer/dryer",
      available_date: "2026-05-01",
      landlord_name: "Bay Area Property Group",
      landlord_contact: "leasing@bapg.com",
      score: 88,
      score_breakdown: JSON.stringify({
        commute: { score: 85, weight: 0.35, weighted_score: 29.75, reason: "35-45 min Caltrain to SF Financial District, reliable transit option" },
        price: { score: 78, weight: 0.25, weighted_score: 19.5, reason: "At $3,800, well within budget range" },
        safety: { score: 92, weight: 0.2, weighted_score: 18.4, reason: "Downtown Mountain View is very safe, well-lit, active community" },
        walkability: { score: 94, weight: 0.1, weighted_score: 9.4, reason: "Castro Street is one of the most walkable areas on the Peninsula" },
        pet_friendly: { score: 80, weight: 0.1, weighted_score: 8.0, reason: "Pets allowed with deposit, reasonable terms" },
      }),
      status: "applied",
      notes: "Top pick. Love the walkability and Caltrain access.",
    },
    {
      url: "https://www.redfin.com/CA/San-Mateo/456-El-Camino-Real/example",
      source: "redfin",
      address: "456 El Camino Real, Unit 12",
      city: "San Mateo",
      neighborhood: "Downtown San Mateo",
      price: 3400,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1200,
      description:
        "Spacious 3-bedroom apartment in Downtown San Mateo. Close to Hillsdale Shopping Center and Caltrain. Updated appliances, central heating, shared laundry on-site. Street parking available. Small pets negotiable.",
      pet_policy: "Small pets negotiable with landlord",
      parking: "Street parking, permit area",
      laundry: "Shared on-site",
      available_date: "2026-05-15",
      landlord_name: "Maria Chen",
      landlord_contact: "maria.chen.rentals@gmail.com",
      score: 82,
      score_breakdown: JSON.stringify({
        commute: { score: 80, weight: 0.35, weighted_score: 28.0, reason: "30-40 min Caltrain to SF, good Hillsdale station access" },
        price: { score: 90, weight: 0.25, weighted_score: 22.5, reason: "At $3,400, very affordable for the area" },
        safety: { score: 85, weight: 0.2, weighted_score: 17.0, reason: "Downtown San Mateo is generally safe, good lighting" },
        walkability: { score: 75, weight: 0.1, weighted_score: 7.5, reason: "Walkable to shops and dining on B Street" },
        pet_friendly: { score: 60, weight: 0.1, weighted_score: 6.0, reason: "Pets negotiable but not guaranteed" },
      }),
      status: "saved",
      notes: "Good price point. Need to confirm pet policy.",
    },
    {
      url: "https://sfbay.craigslist.org/pen/apa/daly-city-3br/example",
      source: "craigslist",
      address: "88 Westlake Avenue",
      city: "Daly City",
      neighborhood: "Westlake",
      price: 2900,
      bedrooms: 3,
      bathrooms: 1,
      sqft: 1050,
      description:
        "3BR/1BA in quiet Daly City neighborhood. Close to BART and 280 freeway. Garage parking included. Older building but well-maintained. No pets. Coin laundry in building.",
      pet_policy: "No pets allowed",
      parking: "1-car garage included",
      laundry: "Coin-op in building",
      available_date: "2026-04-15",
      landlord_name: null,
      landlord_contact: "reply to posting",
      score: 76,
      score_breakdown: JSON.stringify({
        commute: { score: 75, weight: 0.35, weighted_score: 26.25, reason: "BART accessible but still 40-50 min to Financial District with transfer" },
        price: { score: 95, weight: 0.25, weighted_score: 23.75, reason: "At $2,900, below budget minimum — great value" },
        safety: { score: 78, weight: 0.2, weighted_score: 15.6, reason: "Westlake is a quiet residential area, generally safe" },
        walkability: { score: 55, weight: 0.1, weighted_score: 5.5, reason: "Car-dependent area, some shops on Westlake but limited" },
        pet_friendly: { score: 0, weight: 0.1, weighted_score: 0.0, reason: "No pets allowed — dealbreaker if you have pets" },
      }),
      status: "saved",
      notes: "Cheapest option but only 1BA and no pets.",
    },
    {
      url: "https://www.apartments.com/redwood-city-ca/789-jefferson/example",
      source: "apartments",
      address: "789 Jefferson Avenue",
      city: "Redwood City",
      neighborhood: "Downtown Redwood City",
      price: 3600,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1280,
      description:
        "Modern 3BR/2BA in the vibrant Downtown Redwood City area. Steps from Courthouse Square restaurants and shops. Caltrain station within walking distance. In-unit laundry, balcony, AC. Pet-friendly community with dog park. 2 parking spots included.",
      pet_policy: "Dogs and cats welcome, breed restrictions apply, $50/mo pet rent",
      parking: "2 assigned spots in garage",
      laundry: "In-unit washer/dryer",
      available_date: "2026-06-01",
      landlord_name: "Sequoia Residential",
      landlord_contact: "leasing@sequoiaresidential.com",
      score: 85,
      score_breakdown: JSON.stringify({
        commute: { score: 78, weight: 0.35, weighted_score: 27.3, reason: "40-50 min Caltrain to SF, decent but not the fastest" },
        price: { score: 82, weight: 0.25, weighted_score: 20.5, reason: "At $3,600, comfortably within budget" },
        safety: { score: 88, weight: 0.2, weighted_score: 17.6, reason: "Downtown Redwood City is safe, well-patrolled, active nightlife" },
        walkability: { score: 90, weight: 0.1, weighted_score: 9.0, reason: "Excellent walkability around Courthouse Square" },
        pet_friendly: { score: 90, weight: 0.1, weighted_score: 9.0, reason: "Very pet-friendly with dog park on-site" },
      }),
      status: "saved",
      notes: "Great all-around option. Dog park is a big plus.",
    },
    {
      url: "https://www.zillow.com/homedetails/321-Airport-Blvd-South-SF/example",
      source: "zillow",
      address: "321 Airport Boulevard, Unit 8C",
      city: "South San Francisco",
      neighborhood: "Oyster Point",
      price: 3200,
      bedrooms: 2,
      bathrooms: 2,
      sqft: 980,
      description:
        "Updated 2BR/2BA near Oyster Point. Quick access to 101 and BART. Modern finishes, quartz counters, stainless appliances. Community pool and gym. 1 parking spot. Cats only. On-site laundry room.",
      pet_policy: "Cats only, $300 deposit",
      parking: "1 assigned spot",
      laundry: "On-site laundry room",
      available_date: "2026-05-01",
      landlord_name: "SSF Living LLC",
      landlord_contact: "info@ssfliving.com",
      score: 71,
      score_breakdown: JSON.stringify({
        commute: { score: 82, weight: 0.35, weighted_score: 28.7, reason: "Close to BART, 25-35 min to Financial District" },
        price: { score: 85, weight: 0.25, weighted_score: 21.25, reason: "At $3,200, good value for the location" },
        safety: { score: 72, weight: 0.2, weighted_score: 14.4, reason: "Oyster Point area is commercial, less residential feel" },
        walkability: { score: 40, weight: 0.1, weighted_score: 4.0, reason: "Very car-dependent, limited walkable amenities" },
        pet_friendly: { score: 30, weight: 0.1, weighted_score: 3.0, reason: "Cats only — no dogs allowed" },
      }),
      status: "rejected",
      notes: "Only 2BR and cats only. Close to airport noise.",
    },
    {
      url: "https://www.redfin.com/CA/Sunnyvale/555-Mathilda-Ave/example",
      source: "redfin",
      address: "555 Mathilda Avenue, Apt 204",
      city: "Sunnyvale",
      neighborhood: "Downtown Sunnyvale",
      price: 4200,
      bedrooms: 3,
      bathrooms: 2,
      sqft: 1420,
      description:
        "Luxury 3BR/2BA in newer construction near Downtown Sunnyvale. Top-rated Cupertino Union school district. Chef's kitchen, hardwood floors, large balcony. Resort-style pool, fitness center, co-working space. 2 parking spots, EV charging. Pet-friendly.",
      pet_policy: "Dogs and cats welcome, up to 2 pets, $75/mo pet rent per pet",
      parking: "2 spots with EV charging",
      laundry: "In-unit full-size washer/dryer",
      available_date: "2026-06-15",
      landlord_name: "Prometheus Real Estate Group",
      landlord_contact: "sunnyvale@prometheusreg.com",
      score: 79,
      score_breakdown: JSON.stringify({
        commute: { score: 65, weight: 0.35, weighted_score: 22.75, reason: "50-60 min Caltrain to SF, longer commute" },
        price: { score: 60, weight: 0.25, weighted_score: 15.0, reason: "At $4,200, near top of budget — tight" },
        safety: { score: 95, weight: 0.2, weighted_score: 19.0, reason: "Downtown Sunnyvale is very safe, family-friendly" },
        walkability: { score: 82, weight: 0.1, weighted_score: 8.2, reason: "Good walkability around Murphy Avenue" },
        pet_friendly: { score: 95, weight: 0.1, weighted_score: 9.5, reason: "Very pet-friendly, multiple pets allowed" },
      }),
      status: "saved",
      notes: "Beautiful but expensive. Schools are amazing though.",
    },
  ];

  const listingIds: number[] = [];
  for (const listing of listings) {
    const result = db.run(
      `INSERT INTO listings (user_id, url, source, address, city, neighborhood, price, bedrooms, bathrooms, sqft, description, pet_policy, parking, laundry, available_date, landlord_name, landlord_contact, score, score_breakdown, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId as number,
        listing.url,
        listing.source,
        listing.address,
        listing.city,
        listing.neighborhood,
        listing.price,
        listing.bedrooms,
        listing.bathrooms,
        listing.sqft,
        listing.description,
        listing.pet_policy,
        listing.parking,
        listing.laundry,
        listing.available_date,
        listing.landlord_name,
        listing.landlord_contact,
        listing.score,
        listing.score_breakdown,
        listing.status,
        listing.notes,
      ]
    );
    listingIds.push(result.lastInsertRowid as number);
  }

  // Applications: Mountain View (docs submitted) and San Mateo (inquiry)
  db.run(
    `INSERT INTO applications (listing_id, user_id, date_applied, docs_submitted, status, follow_up_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      listingIds[0],
      userId as number,
      "2026-03-28",
      JSON.stringify(["pay_stubs", "credit_report", "references"]),
      "docs_sent",
      "2026-04-05",
      "Submitted full application package. They said 3-5 business days for review.",
    ]
  );

  db.run(
    `INSERT INTO applications (listing_id, user_id, date_applied, docs_submitted, status, follow_up_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      listingIds[1],
      userId as number,
      "2026-04-01",
      JSON.stringify([]),
      "inquiry",
      "2026-04-04",
      "Sent inquiry email asking about pet policy and availability. Waiting for response.",
    ]
  );

  // Neighborhood report for Mountain View
  db.run(
    `INSERT INTO neighborhood_reports (listing_id, address, commute_time, commute_distance, walk_score, transit_score, crime_summary, parks_nearby, grocery_nearby, schools_nearby, noise_level, ai_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      listingIds[0],
      "742 Castro Street, Mountain View, CA",
      "35-45 min via Caltrain to SF Financial District; 45-60 min driving during rush hour",
      "33 miles to Financial District",
      89,
      72,
      "Mountain View has low crime rates compared to national and Bay Area averages. Downtown area is well-lit and heavily foot-trafficked. Property crime is the primary concern, typical of suburban Bay Area cities.",
      "Pioneer Park (0.3 mi), Rengstorff Park (1.2 mi), Shoreline Lake & Park (2.5 mi), Stevens Creek Trail nearby",
      "Trader Joe's (0.4 mi), Safeway (0.6 mi), 99 Ranch Market (1.5 mi), Whole Foods (0.8 mi)",
      "Bubb Elementary (API 920+), Graham Middle, Mountain View High — all well-rated. Cupertino Union district nearby.",
      "Low to moderate. Castro Street has evening restaurant activity but quiets down by 10pm. No airport noise. Occasional Caltrain horn.",
      "Downtown Mountain View is one of the Peninsula's most livable neighborhoods for renters. Castro Street serves as the vibrant main artery, lined with restaurants, coffee shops, and boutiques — all walkable from this address. The Caltrain station is a 10-minute walk, making the SF commute manageable without driving.\n\nThe area attracts a mix of tech workers, families, and long-time residents, creating a diverse and active community. Weekend farmers' markets, outdoor dining, and proximity to Shoreline Park provide excellent quality of life. Grocery options are plentiful with Trader Joe's, Safeway, and Whole Foods all within a mile.\n\nThe main trade-off is price — Mountain View commands a premium for this walkability and convenience. Parking can be tight on Castro Street evenings, but with an assigned spot, that's less of a concern. The neighborhood is very safe for evening walks, and the presence of Google's campus nearby keeps the local economy strong.",
    ]
  );

  // Comparison board: "Top 3 picks"
  db.run(
    `INSERT INTO comparisons (user_id, name, listing_ids)
     VALUES (?, ?, ?)`,
    [
      userId as number,
      "Top 3 Picks",
      JSON.stringify([listingIds[0], listingIds[3], listingIds[1]]),
    ]
  );

  console.log("[seed] Demo data seeded successfully:");
  console.log(`  - 1 user (Trang)`);
  console.log(`  - 6 listings`);
  console.log(`  - 2 applications`);
  console.log(`  - 1 neighborhood report`);
  console.log(`  - 1 comparison board`);
}
