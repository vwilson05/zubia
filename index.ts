import db from "./db";
import { seedDemoData } from "./seed-demo";
import {
  extractListingFromURL,
  searchListingsByURL,
  searchListingsByLocation,
  searchRedfinListings,
  scoreListing,
  generateNeighborhoodReport,
  generateComparison,
  generateAdvisorResponse,
  detectScamRisk,
} from "./ai";
import type { SearchResult } from "./ai";
import path from "path";
import fs from "fs";

// Auto-seed demo data if empty
await seedDemoData();

const isDev = process.env.NODE_ENV !== "production";
const PORT = parseInt(process.env.PORT || "3342");

// Allowed email addresses (whitelist)
const ALLOWED_EMAILS = ["trangbui05@gmail.com"];

// Auth helpers
function generateSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getSessionFromCookie(req: Request): any | null {
  const cookie = req.headers.get("cookie");
  if (!cookie) return null;
  const match = cookie.match(/zubia_session=([^;]+)/);
  if (!match) return null;
  const token = match[1];
  const session = db
    .query(
      "SELECT s.*, u.id as uid, u.name, u.email FROM sessions s JOIN users u ON s.user_id = u.id WHERE s.token = ? AND s.expires_at > datetime('now')"
    )
    .get(token) as any;
  return session;
}

function isDemoSession(req: Request): boolean {
  const cookie = req.headers.get("cookie");
  if (!cookie) return false;
  return cookie.includes("zubia_demo=1");
}

function getDemoUser(): any | null {
  return db.query("SELECT * FROM users WHERE id = 1").get() as any;
}

function getAuthenticatedUser(req: Request): any | null {
  const session = getSessionFromCookie(req);
  if (!session) return null;
  return db.query("SELECT * FROM users WHERE id = ?").get(session.user_id) as any;
}

function setCookie(name: string, value: string, maxAge: number): string {
  return `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

// Get user from request (authenticated) or fallback to first user (demo/landing)
function getUser(req?: Request): any {
  if (req) {
    const user = getAuthenticatedUser(req);
    if (user) return user;
    if (isDemoSession(req)) return getDemoUser();
  }
  return db.query("SELECT * FROM users LIMIT 1").get() as any;
}

function parseJSON(str: string | null | undefined): any {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

function jsonResponse(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400) {
  return jsonResponse({ error: message }, status);
}

// Build frontend with Bun
async function buildFrontend() {
  const result = await Bun.build({
    entrypoints: [path.join(import.meta.dir, "frontend/main.tsx")],
    outdir: path.join(import.meta.dir, "dist"),
    naming: "[name].[hash].[ext]",
    minify: !isDev,
    sourcemap: isDev ? "inline" : "none",
    target: "browser",
    define: {
      "process.env.NODE_ENV": JSON.stringify(
        isDev ? "development" : "production"
      ),
    },
  });

  if (!result.success) {
    console.error("Build failed:", result.logs);
    return null;
  }

  return result.outputs[0];
}

let bundlePath: string | null = null;
let bundleContent: string | null = null;

async function ensureBundle() {
  if (!bundlePath || isDev) {
    const output = await buildFrontend();
    if (output) {
      bundlePath = output.path;
      bundleContent = await Bun.file(output.path).text();
    }
  }
}

// Initial build
await ensureBundle();

const server = Bun.serve({
  port: PORT,
  maxRequestBodySize: 25 * 1024 * 1024, // 25MB

  async fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // --- Static files ---
    if (pathname === "/styles.css") {
      const cssPath = path.join(import.meta.dir, "styles.css");
      return new Response(Bun.file(cssPath), {
        headers: { "Content-Type": "text/css", "Cache-Control": "no-cache, must-revalidate" },
      });
    }

    // Serve built JS bundle
    if (pathname.startsWith("/dist/")) {
      const filePath = path.join(import.meta.dir, pathname);
      if (fs.existsSync(filePath)) {
        return new Response(Bun.file(filePath), {
          headers: { "Content-Type": "application/javascript" },
        });
      }
    }

    // --- Auth Routes ---

    // POST /auth/login — Email/password login
    if (pathname === "/auth/login" && method === "POST") {
      try {
        const body = await req.json();
        const { email, password } = body;
        if (!email || !password) return errorResponse("Email and password are required");

        const user = db.query("SELECT * FROM users WHERE email = ?").get(email) as any;
        if (!user || !user.password_hash) {
          // Check if email is allowed but account doesn't exist
          if (ALLOWED_EMAILS.includes(email.toLowerCase())) {
            return errorResponse("Account not set up yet. Contact support.", 401);
          }
          return errorResponse("Access coming soon. Your account is not yet active.", 403);
        }

        // Check if email is in allowlist
        if (!ALLOWED_EMAILS.includes(email.toLowerCase())) {
          return errorResponse("Access coming soon. Your account is not yet active.", 403);
        }

        const valid = await Bun.password.verify(password, user.password_hash);
        if (!valid) return errorResponse("Invalid email or password", 401);

        // Create session
        const token = generateSessionToken();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
        db.run(
          "INSERT INTO sessions (user_id, token, expires_at) VALUES (?, ?, ?)",
          [user.id, token, expiresAt]
        );

        return new Response(
          JSON.stringify({ user: { id: user.id, name: user.name, email: user.email } }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Set-Cookie": setCookie("zubia_session", token, 30 * 24 * 60 * 60),
            },
          }
        );
      } catch (e: any) {
        console.error("Login error:", e);
        return errorResponse("Login failed", 500);
      }
    }

    // GET /auth/me — Current user
    if (pathname === "/auth/me" && method === "GET") {
      const user = getAuthenticatedUser(req);
      if (user) return jsonResponse({ id: user.id, name: user.name, email: user.email });

      // Demo session: return demo user with demo flag
      if (isDemoSession(req)) {
        const demoUser = getDemoUser();
        if (demoUser) return jsonResponse({ id: demoUser.id, name: demoUser.name, email: demoUser.email, demo: true });
      }

      return errorResponse("Not authenticated", 401);
    }

    // POST /auth/logout — Clear session
    if (pathname === "/auth/logout" && method === "POST") {
      const session = getSessionFromCookie(req);
      if (session) {
        db.run("DELETE FROM sessions WHERE token = ?", [session.token]);
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Set-Cookie": setCookie("zubia_session", "", 0),
        },
      });
    }

    // GET /auth/demo — Start a demo session (read-only, user_id=1)
    if (pathname === "/auth/demo" && method === "GET") {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/demo",
          "Set-Cookie": setCookie("zubia_demo", "1", 24 * 60 * 60), // 24 hours
        },
      });
    }

    // --- API Routes ---

    // Public API: email signup (no auth required)
    if (pathname === "/api/email-signup" && method === "POST") {
      const body = await req.json();
      if (!body.email) return errorResponse("Email is required");

      try {
        db.run(
          "INSERT OR IGNORE INTO email_signups (email, source) VALUES (?, ?)",
          [body.email, body.source || "landing"]
        );
        return jsonResponse({ success: true });
      } catch (e) {
        return jsonResponse({ success: true }); // Don't reveal duplicates
      }
    }

    // Auth middleware for all other /api/* routes
    if (pathname.startsWith("/api/")) {
      const isDemo = isDemoSession(req);
      const user = getAuthenticatedUser(req);

      if (!user && !isDemo) return errorResponse("Not authenticated", 401);

      // Demo sessions are read-only: block POST, PUT, DELETE (except advisor which is read-like)
      if (isDemo && !user && method !== "GET") {
        const allowedDemoPosts = ["/api/advisor", "/api/compare"];
        if (!allowedDemoPosts.includes(pathname)) {
          return jsonResponse({ error: "Sign in to save changes", demo: true }, 403);
        }
      }
    }

    // POST /api/listings/add — Paste URL, AI extracts + scores
    if (pathname === "/api/listings/add" && method === "POST") {
      try {
        const body = await req.json();
        const { url: listingUrl } = body;
        if (!listingUrl) return errorResponse("URL is required");

        const user = getUser(req);
        const extracted = await extractListingFromURL(listingUrl);

        // Score the listing
        const userPrefs = {
          commute_address: user?.commute_address,
          budget_min: user?.budget_min,
          budget_max: user?.budget_max,
          bedrooms: user?.bedrooms,
          bathrooms: user?.bathrooms,
          pet_friendly: user?.pet_friendly,
          priorities: parseJSON(user?.priorities),
          must_haves: parseJSON(user?.must_haves) || [],
          nice_to_haves: parseJSON(user?.nice_to_haves) || [],
        };

        const listingForScore = { ...extracted };
        const { score, breakdown, missing_must_haves, present_nice_to_haves, must_have_capped } = await scoreListing(
          listingForScore,
          userPrefs
        );

        // Detect scam risk
        const scamResult = await detectScamRisk({ ...extracted, source: extracted.source });

        // Save to database
        const result = db.run(
          `INSERT INTO listings (user_id, url, source, address, city, neighborhood, price, bedrooms, bathrooms, sqft, photos, description, pet_policy, parking, laundry, available_date, landlord_name, landlord_contact, raw_data, score, score_breakdown, status)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved')`,
          [
            user?.id || 1,
            String(listingUrl || ""),
            String(extracted.source || "other"),
            extracted.address ? String(extracted.address) : null,
            extracted.city ? String(extracted.city) : null,
            extracted.neighborhood ? String(extracted.neighborhood) : null,
            typeof extracted.price === "number" ? extracted.price : null,
            typeof extracted.bedrooms === "number" ? extracted.bedrooms : null,
            typeof extracted.bathrooms === "number" ? extracted.bathrooms : null,
            typeof extracted.sqft === "number" ? extracted.sqft : null,
            JSON.stringify(extracted.photos || []),
            extracted.description ? String(extracted.description).slice(0, 5000) : null,
            extracted.pet_policy ? String(extracted.pet_policy) : null,
            extracted.parking ? String(extracted.parking) : null,
            extracted.laundry ? String(extracted.laundry) : null,
            extracted.available_date ? String(extracted.available_date) : null,
            extracted.landlord_name ? String(extracted.landlord_name) : null,
            extracted.landlord_contact ? String(extracted.landlord_contact) : null,
            JSON.stringify(extracted),
            typeof score === "number" ? score : 50,
            JSON.stringify({ ...breakdown, _missing_must_haves: missing_must_haves || [], _present_nice_to_haves: present_nice_to_haves || [], _must_have_capped: must_have_capped || false }),
          ]
        );

        const newListing = db
          .query("SELECT * FROM listings WHERE id = ?")
          .get(result.lastInsertRowid) as any;

        return jsonResponse({
          listing: {
            ...newListing,
            photos: parseJSON(newListing.photos),
            score_breakdown: parseJSON(newListing.score_breakdown),
            raw_data: parseJSON(newListing.raw_data),
          },
          scam_risk: scamResult,
        });
      } catch (e: any) {
        console.error("Error adding listing:", e);
        return errorResponse(e.message || "Failed to add listing", 500);
      }
    }

    // POST /api/listings/import-search — Bulk import from Zillow or Redfin search URL or location
    if (pathname === "/api/listings/import-search" && method === "POST") {
      try {
        const body = await req.json();
        // Support both old format (url) and new format (location + source + filters)
        const rawLocation = body.location || body.url;
        const source = body.source || "zillow";
        const page = body.page || 1;
        if (!rawLocation) return errorResponse("Search URL or location is required");

        const user = getUser(req);
        const userPrefs = {
          commute_address: user?.commute_address,
          budget_min: user?.budget_min,
          budget_max: user?.budget_max,
          bedrooms: user?.bedrooms,
          bathrooms: user?.bathrooms,
          pet_friendly: user?.pet_friendly,
          priorities: parseJSON(user?.priorities),
          must_haves: parseJSON(user?.must_haves) || [],
          nice_to_haves: parseJSON(user?.nice_to_haves) || [],
        };

        // Use filter overrides from request body, fall back to user prefs
        const filterBeds = body.beds ? parseInt(body.beds) : (userPrefs.bedrooms || undefined);
        const filterBaths = body.baths ? parseFloat(body.baths) : (userPrefs.bathrooms || undefined);
        const filterMinPrice = body.minPrice || userPrefs.budget_min || undefined;
        const filterMaxPrice = body.maxPrice || userPrefs.budget_max || undefined;

        // Detect if input is a URL or a natural language location
        const isZillowUrl = rawLocation.includes("zillow.com");
        const isRedfinUrl = rawLocation.includes("redfin.com");
        const isUrl = rawLocation.startsWith("http");
        let searchData;

        if (isZillowUrl) {
          // Zillow search URL with filters baked in
          searchData = await searchListingsByURL(rawLocation, page);
        } else if (isRedfinUrl) {
          // Redfin URL
          searchData = await searchRedfinListings(rawLocation, page);
        } else {
          // Natural language location — convert to URL-friendly format
          const formattedLocation = rawLocation
            .trim()
            .toLowerCase()
            .replace(/[,]+/g, " ")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");

          if (source === "redfin") {
            searchData = await searchRedfinListings(formattedLocation, page);
          } else {
            // Default: Zillow location search
            searchData = await searchListingsByLocation(formattedLocation, {
              listType: "for-rent",
              beds: filterBeds,
              baths: filterBaths,
              minPrice: filterMinPrice,
              maxPrice: filterMaxPrice,
              page,
            });
          }
        }

        // Score each result using a lightweight in-memory scoring approach
        const scoredResults = await Promise.all(
          searchData.results.map(async (r: SearchResult) => {
            const listingForScore = {
              address: r.address.street,
              city: `${r.address.city}, ${r.address.state} ${r.address.zipcode}`,
              price: r.unformattedPrice,
              bedrooms: r.beds,
              bathrooms: r.baths,
              sqft: r.livingArea || r.area,
              description: `${r.homeType} - ${r.beds} bed, ${r.baths} bath, ${r.livingArea || r.area} sqft`,
            };

            try {
              const { score, breakdown } = await scoreListing(listingForScore, userPrefs);
              return { ...r, score, scoreBreakdown: breakdown };
            } catch (e) {
              console.error(`Failed to score ${r.address.street}:`, e);
              return { ...r, score: 50, scoreBreakdown: {} };
            }
          })
        );

        return jsonResponse({
          success: true,
          totalCount: searchData.totalCount,
          filteredCount: searchData.filteredCount,
          currentPage: parseInt(searchData.currentPage) || 1,
          results: scoredResults,
        });
      } catch (e: any) {
        console.error("Error importing search:", e);
        return errorResponse(e.message || "Failed to search listings", 500);
      }
    }

    // POST /api/listings/bulk-save — Save selected listings from search results
    if (pathname === "/api/listings/bulk-save" && method === "POST") {
      try {
        const body = await req.json();
        const { listings } = body;
        if (!listings || !Array.isArray(listings) || listings.length === 0) {
          return errorResponse("listings array is required");
        }

        const user = getUser(req);
        const saved: any[] = [];

        for (const item of listings) {
          const fullAddress = `${item.address.street}, ${item.address.city}, ${item.address.state} ${item.address.zipcode}`;
          const listingSource = (item.detailUrl || "").includes("redfin.com") ? "redfin" : "zillow";
          const result = db.run(
            `INSERT INTO listings (user_id, url, source, address, city, neighborhood, price, bedrooms, bathrooms, sqft, photos, description, pet_policy, parking, laundry, available_date, landlord_name, landlord_contact, raw_data, score, score_breakdown, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'saved')`,
            [
              user?.id || 1,
              item.detailUrl || null,
              listingSource,
              item.address.street || null,
              `${item.address.city}, ${item.address.state} ${item.address.zipcode}`,
              null,
              item.unformattedPrice || null,
              item.beds || null,
              item.baths || null,
              item.livingArea || item.area || null,
              JSON.stringify(item.imgSrc ? [item.imgSrc] : []),
              `${item.homeType || "Home"} - ${item.beds} bed, ${item.baths} bath, ${item.livingArea || item.area || "?"} sqft`,
              null,
              null,
              null,
              null,
              null,
              null,
              JSON.stringify(item),
              item.score || 50,
              JSON.stringify(item.scoreBreakdown || {}),
            ]
          );

          const newListing = db
            .query("SELECT * FROM listings WHERE id = ?")
            .get(result.lastInsertRowid) as any;
          saved.push({
            ...newListing,
            photos: parseJSON(newListing.photos),
            score_breakdown: parseJSON(newListing.score_breakdown),
          });
        }

        return jsonResponse({ success: true, count: saved.length, listings: saved });
      } catch (e: any) {
        console.error("Error bulk saving:", e);
        return errorResponse(e.message || "Failed to save listings", 500);
      }
    }

    // GET /api/listings
    if (pathname === "/api/listings" && method === "GET") {
      const listings = db
        .query("SELECT * FROM listings ORDER BY score DESC")
        .all() as any[];
      return jsonResponse(
        listings.map((l) => ({
          ...l,
          photos: parseJSON(l.photos),
          score_breakdown: parseJSON(l.score_breakdown),
          raw_data: parseJSON(l.raw_data),
        }))
      );
    }

    // PUT /api/listings/:id
    const listingPutMatch = pathname.match(/^\/api\/listings\/(\d+)$/);
    if (listingPutMatch && method === "PUT") {
      const id = parseInt(listingPutMatch[1]);
      const body = await req.json();
      const fields: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (
          [
            "status",
            "notes",
            "address",
            "city",
            "price",
            "bedrooms",
            "bathrooms",
            "score",
          ].includes(key)
        ) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')");
        values.push(id);
        db.run(
          `UPDATE listings SET ${fields.join(", ")} WHERE id = ?`,
          values
        );
      }

      const updated = db
        .query("SELECT * FROM listings WHERE id = ?")
        .get(id) as any;
      return jsonResponse({
        ...updated,
        photos: parseJSON(updated?.photos),
        score_breakdown: parseJSON(updated?.score_breakdown),
      });
    }

    // DELETE /api/listings/:id
    const listingDeleteMatch = pathname.match(/^\/api\/listings\/(\d+)$/);
    if (listingDeleteMatch && method === "DELETE") {
      const id = parseInt(listingDeleteMatch[1]);
      db.run("DELETE FROM listings WHERE id = ?", [id]);
      return jsonResponse({ success: true });
    }

    // POST /api/listings/:id/score — Re-score
    const scoreMatch = pathname.match(/^\/api\/listings\/(\d+)\/score$/);
    if (scoreMatch && method === "POST") {
      const id = parseInt(scoreMatch[1]);
      const listing = db
        .query("SELECT * FROM listings WHERE id = ?")
        .get(id) as any;
      if (!listing) return errorResponse("Listing not found", 404);

      const user = getUser(req);
      const userPrefs = {
        commute_address: user?.commute_address,
        budget_min: user?.budget_min,
        budget_max: user?.budget_max,
        bedrooms: user?.bedrooms,
        bathrooms: user?.bathrooms,
        pet_friendly: user?.pet_friendly,
        priorities: parseJSON(user?.priorities),
        must_haves: parseJSON(user?.must_haves) || [],
        nice_to_haves: parseJSON(user?.nice_to_haves) || [],
      };

      const { score, breakdown, missing_must_haves, present_nice_to_haves, must_have_capped } = await scoreListing(listing, userPrefs);
      const fullBreakdown = { ...breakdown, _missing_must_haves: missing_must_haves || [], _present_nice_to_haves: present_nice_to_haves || [], _must_have_capped: must_have_capped || false };
      db.run(
        "UPDATE listings SET score = ?, score_breakdown = ?, updated_at = datetime('now') WHERE id = ?",
        [score, JSON.stringify(fullBreakdown), id]
      );

      return jsonResponse({ score, breakdown: fullBreakdown });
    }

    // GET /api/listings/:id/neighborhood
    const neighborhoodMatch = pathname.match(
      /^\/api\/listings\/(\d+)\/neighborhood$/
    );
    if (neighborhoodMatch && method === "GET") {
      const id = parseInt(neighborhoodMatch[1]);

      // Check for existing report
      let report = db
        .query("SELECT * FROM neighborhood_reports WHERE listing_id = ?")
        .get(id) as any;
      if (report) return jsonResponse(report);

      // Generate new report
      const listing = db
        .query("SELECT * FROM listings WHERE id = ?")
        .get(id) as any;
      if (!listing) return errorResponse("Listing not found", 404);

      const user = getUser(req);
      const reportData = await generateNeighborhoodReport(
        `${listing.address}, ${listing.city}`,
        user?.commute_address
      );

      db.run(
        `INSERT INTO neighborhood_reports (listing_id, address, commute_time, commute_distance, walk_score, transit_score, crime_summary, parks_nearby, grocery_nearby, schools_nearby, noise_level, ai_summary)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          `${listing.address}, ${listing.city}`,
          reportData.commute_time,
          reportData.commute_distance,
          reportData.walk_score,
          reportData.transit_score,
          reportData.crime_summary,
          reportData.parks_nearby,
          reportData.grocery_nearby,
          reportData.schools_nearby,
          reportData.noise_level,
          reportData.ai_summary,
        ]
      );

      report = db
        .query(
          "SELECT * FROM neighborhood_reports WHERE listing_id = ? ORDER BY id DESC LIMIT 1"
        )
        .get(id);
      return jsonResponse(report);
    }

    // POST /api/compare
    if (pathname === "/api/compare" && method === "POST") {
      const body = await req.json();
      const { listing_ids, name } = body;
      if (!listing_ids || !Array.isArray(listing_ids) || listing_ids.length < 2)
        return errorResponse("Need at least 2 listing IDs");

      const placeholders = listing_ids.map(() => "?").join(",");
      const listings = db
        .query(`SELECT * FROM listings WHERE id IN (${placeholders})`)
        .all(...listing_ids) as any[];

      const user = getUser(req);
      const userPrefs = {
        commute_address: user?.commute_address,
        budget_min: user?.budget_min,
        budget_max: user?.budget_max,
        bedrooms: user?.bedrooms,
        bathrooms: user?.bathrooms,
        pet_friendly: user?.pet_friendly,
        priorities: parseJSON(user?.priorities),
      };

      const comparison = await generateComparison(listings, userPrefs);

      // Save comparison board
      if (name) {
        db.run(
          "INSERT INTO comparisons (user_id, name, listing_ids) VALUES (?, ?, ?)",
          [user?.id || 1, name, JSON.stringify(listing_ids)]
        );
      }

      return jsonResponse({
        comparison,
        listings: listings.map((l) => ({
          ...l,
          score_breakdown: parseJSON(l.score_breakdown),
        })),
      });
    }

    // POST /api/advisor
    if (pathname === "/api/advisor" && method === "POST") {
      const body = await req.json();
      const { question } = body;
      if (!question) return errorResponse("Question is required");

      const user = getUser(req);
      const listings = db
        .query("SELECT * FROM listings WHERE user_id = ? ORDER BY score DESC")
        .all(user?.id || 1) as any[];

      const userPrefs = {
        commute_address: user?.commute_address,
        budget_min: user?.budget_min,
        budget_max: user?.budget_max,
        bedrooms: user?.bedrooms,
        bathrooms: user?.bathrooms,
        pet_friendly: user?.pet_friendly,
        priorities: parseJSON(user?.priorities),
      };

      const response = await generateAdvisorResponse(
        question,
        listings,
        userPrefs
      );
      return jsonResponse({ response });
    }

    // GET /api/preferences
    if (pathname === "/api/preferences" && method === "GET") {
      const user = getUser(req);
      if (!user) return jsonResponse({});
      return jsonResponse({
        ...user,
        priorities: parseJSON(user.priorities),
        must_haves: parseJSON(user.must_haves) || [],
        nice_to_haves: parseJSON(user.nice_to_haves) || [],
      });
    }

    // POST /api/preferences
    if (pathname === "/api/preferences" && method === "POST") {
      const body = await req.json();
      let user = getUser();

      if (!user) {
        db.run(
          `INSERT INTO users (name, email, commute_address, budget_min, budget_max, priorities, bedrooms, bathrooms, pet_friendly, parking, laundry, must_haves, nice_to_haves)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            body.name || "User",
            body.email || null,
            body.commute_address || null,
            body.budget_min || null,
            body.budget_max || null,
            JSON.stringify(body.priorities || []),
            body.bedrooms || null,
            body.bathrooms || null,
            body.pet_friendly ? 1 : 0,
            body.parking || null,
            body.laundry || null,
            JSON.stringify(body.must_haves || []),
            JSON.stringify(body.nice_to_haves || []),
          ]
        );
      } else {
        db.run(
          `UPDATE users SET name = ?, email = ?, commute_address = ?, budget_min = ?, budget_max = ?, priorities = ?, bedrooms = ?, bathrooms = ?, pet_friendly = ?, parking = ?, laundry = ?, must_haves = ?, nice_to_haves = ? WHERE id = ?`,
          [
            body.name || user.name,
            body.email || user.email,
            body.commute_address || user.commute_address,
            body.budget_min ?? user.budget_min,
            body.budget_max ?? user.budget_max,
            JSON.stringify(body.priorities || parseJSON(user.priorities) || []),
            body.bedrooms ?? user.bedrooms,
            body.bathrooms ?? user.bathrooms,
            body.pet_friendly !== undefined
              ? body.pet_friendly
                ? 1
                : 0
              : user.pet_friendly,
            body.parking || user.parking,
            body.laundry || user.laundry,
            JSON.stringify(body.must_haves ?? parseJSON(user.must_haves) ?? []),
            JSON.stringify(body.nice_to_haves ?? parseJSON(user.nice_to_haves) ?? []),
            user.id,
          ]
        );
      }

      user = getUser();
      return jsonResponse({
        ...user,
        priorities: parseJSON(user.priorities),
        must_haves: parseJSON(user.must_haves) || [],
        nice_to_haves: parseJSON(user.nice_to_haves) || [],
      });
    }

    // POST /api/applications
    if (pathname === "/api/applications" && method === "POST") {
      const body = await req.json();
      const user = getUser(req);
      const result = db.run(
        `INSERT INTO applications (listing_id, user_id, date_applied, docs_submitted, status, follow_up_date, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          body.listing_id,
          user?.id || 1,
          body.date_applied || new Date().toISOString().split("T")[0],
          JSON.stringify(body.docs_submitted || []),
          body.status || "inquiry",
          body.follow_up_date || null,
          body.notes || null,
        ]
      );
      const app = db
        .query("SELECT * FROM applications WHERE id = ?")
        .get(result.lastInsertRowid);
      return jsonResponse(app);
    }

    // GET /api/applications
    if (pathname === "/api/applications" && method === "GET") {
      const apps = db
        .query(
          `SELECT a.*, l.address, l.city, l.price, l.score
           FROM applications a
           LEFT JOIN listings l ON a.listing_id = l.id
           ORDER BY a.updated_at DESC`
        )
        .all() as any[];
      return jsonResponse(
        apps.map((a) => ({
          ...a,
          docs_submitted: parseJSON(a.docs_submitted),
        }))
      );
    }

    // PUT /api/applications/:id
    const appPutMatch = pathname.match(/^\/api\/applications\/(\d+)$/);
    if (appPutMatch && method === "PUT") {
      const id = parseInt(appPutMatch[1]);
      const body = await req.json();
      const fields: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (
          ["status", "notes", "follow_up_date", "docs_submitted"].includes(key)
        ) {
          fields.push(`${key} = ?`);
          values.push(
            key === "docs_submitted" ? JSON.stringify(value) : value
          );
        }
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')");
        values.push(id);
        db.run(
          `UPDATE applications SET ${fields.join(", ")} WHERE id = ?`,
          values
        );
      }

      const updated = db
        .query("SELECT * FROM applications WHERE id = ?")
        .get(id);
      return jsonResponse(updated);
    }

    // GET /api/comparisons
    if (pathname === "/api/comparisons" && method === "GET") {
      const comparisons = db
        .query("SELECT * FROM comparisons ORDER BY created_at DESC")
        .all() as any[];
      return jsonResponse(
        comparisons.map((c) => ({
          ...c,
          listing_ids: parseJSON(c.listing_ids),
        }))
      );
    }

    // --- Task Routes ---

    // GET /api/tasks
    if (pathname === "/api/tasks" && method === "GET") {
      const user = getUser(req);
      const tasks = db
        .query(
          `SELECT t.*, l.address as listing_address, l.city as listing_city
           FROM tasks t
           LEFT JOIN listings l ON t.listing_id = l.id
           WHERE t.user_id = ?
           ORDER BY
             CASE t.status WHEN 'todo' THEN 0 WHEN 'in_progress' THEN 1 WHEN 'done' THEN 2 END,
             CASE t.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 END,
             t.due_date ASC`
        )
        .all(user?.id || 1) as any[];
      return jsonResponse(tasks);
    }

    // POST /api/tasks
    if (pathname === "/api/tasks" && method === "POST") {
      const user = getUser(req);
      const body = await req.json();
      if (!body.title) return errorResponse("Title is required");

      const result = db.run(
        `INSERT INTO tasks (user_id, listing_id, title, description, due_date, priority, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          user?.id || 1,
          body.listing_id || null,
          body.title,
          body.description || null,
          body.due_date || null,
          body.priority || "medium",
          body.status || "todo",
        ]
      );

      const task = db
        .query(
          `SELECT t.*, l.address as listing_address, l.city as listing_city
           FROM tasks t LEFT JOIN listings l ON t.listing_id = l.id
           WHERE t.id = ?`
        )
        .get(result.lastInsertRowid);
      return jsonResponse(task);
    }

    // PUT /api/tasks/:id
    const taskPutMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (taskPutMatch && method === "PUT") {
      const id = parseInt(taskPutMatch[1]);
      const body = await req.json();
      const fields: string[] = [];
      const values: any[] = [];

      for (const [key, value] of Object.entries(body)) {
        if (["title", "description", "due_date", "priority", "status", "listing_id"].includes(key)) {
          fields.push(`${key} = ?`);
          values.push(value);
        }
      }

      if (fields.length > 0) {
        fields.push("updated_at = datetime('now')");
        values.push(id);
        db.run(`UPDATE tasks SET ${fields.join(", ")} WHERE id = ?`, values);
      }

      const updated = db
        .query(
          `SELECT t.*, l.address as listing_address, l.city as listing_city
           FROM tasks t LEFT JOIN listings l ON t.listing_id = l.id
           WHERE t.id = ?`
        )
        .get(id);
      return jsonResponse(updated);
    }

    // DELETE /api/tasks/:id
    const taskDeleteMatch = pathname.match(/^\/api\/tasks\/(\d+)$/);
    if (taskDeleteMatch && method === "DELETE") {
      const id = parseInt(taskDeleteMatch[1]);
      db.run("DELETE FROM tasks WHERE id = ?", [id]);
      return jsonResponse({ success: true });
    }

    // --- HTML Routes (SPA) ---
    if (
      pathname === "/" ||
      pathname === "/app" ||
      pathname.startsWith("/app/") ||
      pathname === "/demo" ||
      pathname.startsWith("/demo/")
    ) {
      // Rebuild in dev mode
      if (isDev) {
        await ensureBundle();
      }

      const htmlPath = path.join(import.meta.dir, "index.html");
      let html = await Bun.file(htmlPath).text();

      // Replace the dev script tag with the built bundle
      if (bundlePath) {
        const bundleName = path.basename(bundlePath);
        html = html.replace(
          '<script type="module" src="/frontend/main.tsx"></script>',
          `<script type="module" src="/dist/${bundleName}"></script>`
        );
      }

      return new Response(html, {
        headers: { "Content-Type": "text/html" },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

console.log(`
  ╔══════════════════════════════════════════════╗
  ║                                              ║
  ║   zubia — Stop Scrolling. Start Deciding.    ║
  ║                                              ║
  ║   Running at http://localhost:${PORT}          ║
  ║   ${isDev ? "Development mode (hot reload)" : "Production mode"}              ║
  ║                                              ║
  ╚══════════════════════════════════════════════╝
`);
