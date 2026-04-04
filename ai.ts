import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

interface ListingData {
  address?: string;
  city?: string;
  neighborhood?: string;
  price?: number;
  bedrooms?: number;
  bathrooms?: number;
  sqft?: number;
  description?: string;
  pet_policy?: string;
  parking?: string;
  laundry?: string;
  available_date?: string;
  landlord_name?: string;
  landlord_contact?: string;
  photos?: string[];
  source?: string;
}

interface CriteriaItem {
  id: string;
  label: string;
  type: "preset" | "custom";
}

interface UserPreferences {
  commute_address?: string;
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  pet_friendly?: boolean;
  parking?: string;
  laundry?: string;
  priorities?: Array<{ criterion: string; weight: number }>;
  must_haves?: CriteriaItem[];
  nice_to_haves?: CriteriaItem[];
}

interface ScoreBreakdown {
  [criterion: string]: {
    score: number;
    weight: number;
    weighted_score: number;
    reason: string;
  };
}

interface ScoringResult {
  score: number;
  breakdown: ScoreBreakdown;
  missing_must_haves?: string[];
  present_nice_to_haves?: string[];
  must_have_capped?: boolean;
}

async function resolveShortURL(url: string): Promise<string> {
  // Resolve short links (redf.in, zillow.com/homedetails/...) to full URLs
  const shortDomains = ["redf.in", "zill.ow", "bit.ly", "t.co"];
  const isShort = shortDomains.some(d => url.includes(d));
  if (!isShort) return url;

  try {
    console.log(`[URL] Resolving short link: ${url}`);
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: {
        "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
      },
    });
    const location = res.headers.get("location");
    if (location && !location.includes("ratelimited")) {
      console.log(`[URL] Resolved to: ${location}`);
      return location;
    }
  } catch (e) {
    console.error("[URL] Short link resolution failed:", e);
  }
  return url;
}

function cleanListingURL(url: string): string {
  // Strip UTM params, share tracking, and other junk from listing URLs
  try {
    const u = new URL(url);
    const paramsToRemove = [...u.searchParams.keys()].filter(k =>
      k.startsWith("utm_") || k.match(/^\d+$/) || k === "utm_source" || k === "utm_medium" ||
      k === "utm_campaign" || k === "utm_content" || k === "utm_nooverride" ||
      k === "fbclid" || k === "gclid" || k === "ref"
    );
    paramsToRemove.forEach(k => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
}

export async function extractListingFromURL(rawUrl: string): Promise<ListingData> {
  const resolved = await resolveShortURL(rawUrl);
  const url = cleanListingURL(resolved);
  const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";

  // Detect source
  let source = "other";
  if (url.includes("zillow.com")) source = "zillow";
  else if (url.includes("redfin.com")) source = "redfin";
  else if (url.includes("craigslist.org")) source = "craigslist";
  else if (url.includes("apartments.com")) source = "apartments";

  // For Zillow URLs, use RapidAPI property details endpoint
  if (source === "zillow" && RAPIDAPI_KEY) {
    try {
      console.log("[API] Fetching property details from RapidAPI for:", url);
      const apiUrl = `https://real-estate101.p.rapidapi.com/api/property-details/byurl?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl, {
        headers: {
          "x-rapidapi-host": "real-estate101.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      });
      const data = await res.json();

      if (data.success && data.property) {
        const p = data.property;
        const addr = p.address || {};
        return {
          address: addr.streetAddress || null,
          city: addr.city || null,
          neighborhood: p.neighborhood || null,
          price: p.price || p.rentZestimate || null,
          bedrooms: p.bedrooms || null,
          bathrooms: p.bathrooms || null,
          sqft: p.livingArea?.value || p.livingArea || null,
          description: p.description || null,
          pet_policy: null,
          parking: p.facts_features?.exterior?.parking ? JSON.stringify(p.facts_features.exterior.parking) : null,
          laundry: p.facts_features?.interior?.appliances?.includes("Washer") ? "In-unit" : null,
          available_date: null,
          landlord_name: p.agent?.name || null,
          landlord_contact: p.agent?.phone || null,
          photos: p.photos || [],
          source: "zillow",
        };
      }
      console.log("[API] RapidAPI returned no property data, falling back to URL parsing");
    } catch (e) {
      console.error("[API] RapidAPI property details error:", e);
    }
  }

  // For Redfin URLs, use Redfin RapidAPI property details endpoint
  if (source === "redfin" && RAPIDAPI_KEY) {
    try {
      console.log("[API] Fetching property details from Redfin RapidAPI for:", url);
      const apiUrl = `https://redfin-com-data.p.rapidapi.com/properties/detail-by-url?url=${encodeURIComponent(url)}`;
      const res = await fetch(apiUrl, {
        headers: {
          "x-rapidapi-host": "redfin-com-data.p.rapidapi.com",
          "x-rapidapi-key": RAPIDAPI_KEY,
        },
      });
      const data = await res.json();

      if (data && data.data) {
        const d = data.data;
        const addrInfo = d.aboveTheFold?.addressSectionInfo || {};
        const about = d.about || {};
        const photos = (d.gallery?.photos || []).map((p: any) => typeof p === "string" ? p : (p?.photoUrl || p?.url || "")).filter(Boolean);
        const latestPrice = addrInfo.latestPriceInfo || {};
        const priceInfo = addrInfo.priceInfo || {};

        // Construct address from URL path if not in data
        let address = null;
        if (typeof addrInfo.streetAddress === "string") {
          address = addrInfo.streetAddress;
        } else {
          // Extract from the URL: /CA/San-Jose/6911-Serenity-Way-95120/home/...
          try {
            const urlParts = new URL(url).pathname.split("/").filter(Boolean);
            const addrPart = urlParts.find(p => /^\d+/.test(p) && p.includes("-"));
            if (addrPart) address = addrPart.replace(/-/g, " ");
          } catch {}
        }

        // Get rent price, pet policy, deposit, lease terms from Redfin response
        let rentPrice = null;
        let petPolicy = null;
        let deposit = null;
        let leaseTerms = null;

        // 1. Best source: floorPlans data has exact rent price
        const floorPlansKey = Object.keys(d).find(k => k.startsWith("floorPlans"));
        const floorPlans = floorPlansKey ? d[floorPlansKey] : null;
        if (floorPlans?.unitTypesByBedroom) {
          for (const group of floorPlans.unitTypesByBedroom) {
            for (const unitType of (group.availableUnitTypes || [])) {
              if (unitType.rentPriceMin || unitType.rentPriceMax) {
                rentPrice = unitType.rentPriceMax || unitType.rentPriceMin;
                if (unitType.deposit) deposit = unitType.deposit;
                break;
              }
            }
            if (rentPrice) break;
          }
        }

        // 2. feesAndPolicies has pet, deposit, lease info
        const fees = d.feesAndPolicies || {};
        if (fees.depositFeeMax) deposit = fees.depositFeeMax;
        if (fees.availableLeaseTerms?.length) leaseTerms = fees.availableLeaseTerms.join(", ") + " months";
        if (fees.petPolicies?.length) {
          petPolicy = fees.petPolicies.map((p: any) => p.policyName || "").filter(Boolean).join(", ");
          if (petPolicy) petPolicy = petPolicy.charAt(0).toUpperCase() + petPolicy.slice(1) + " allowed";
        }

        // 3. Check homecards rental extension (also has contact info)
        let contactPhone = null;
        let contactEmail = null;
        const homecardsKey = Object.keys(d).find(k => k.startsWith("homecards"));
        const homecards = homecardsKey ? d[homecardsKey] : null;
        const rental = homecards?.homes?.[0]?.rentalExtension;
        if (rental) {
          if (!rentPrice && rental.rentPriceRange) {
            rentPrice = rental.rentPriceRange.max || rental.rentPriceRange.min;
          }
          contactPhone = rental.desktopPhone || rental.mobileWebPhone || null;
          contactEmail = rental.mlsAgentEmail || null;
        }

        // 4. Fallback: property history events
        if (!rentPrice) {
          const historyEvents = d.belowTheFold?.propertyHistoryInfo?.events || [];
          for (const event of historyEvents) {
            if (typeof event.price === "number" && event.price >= 500 && event.price <= 20000) {
              rentPrice = event.price;
              break;
            }
          }
        }

        // Get sqft as a number
        let sqft = null;
        if (typeof addrInfo.sqFt === "number") sqft = addrInfo.sqFt;
        else if (typeof addrInfo.sqFt?.value === "number") sqft = addrInfo.sqFt.value;
        else if (typeof addrInfo.lotSize === "number") sqft = addrInfo.lotSize;

        return {
          address,
          city: typeof addrInfo.city === "string" ? addrInfo.city : null,
          neighborhood: typeof addrInfo.neighborhood === "string" ? addrInfo.neighborhood : null,
          price: rentPrice,
          bedrooms: typeof addrInfo.beds === "number" ? addrInfo.beds : null,
          bathrooms: typeof addrInfo.baths === "number" ? addrInfo.baths : null,
          sqft,
          description: typeof about.description === "string" ? about.description : null,
          pet_policy: petPolicy,
          parking: null,
          laundry: null,
          available_date: null,
          landlord_name: about.managementCompany?.name || (contactEmail ? contactEmail.split("@")[0] : null),
          landlord_contact: [contactPhone, contactEmail].filter(Boolean).join(" / ") || null,
          photos,
          source: "redfin",
        };
      }
      console.log("[API] Redfin RapidAPI returned no property data, falling back to URL parsing");
    } catch (e) {
      console.error("[API] Redfin RapidAPI property details error:", e);
    }
  }

  // Fallback: extract what we can from the URL structure
  let address = null;
  let city = null;
  try {
    const urlPath = new URL(url).pathname;
    const parts = urlPath.split("/").filter(Boolean);
    // Zillow: homedetails/742-Castro-St-San-Francisco-CA-94114/15063122_zpid
    if (parts.length >= 2) {
      const addrPart = parts.find(p => /\d+.*(?:St|Ave|Rd|Dr|Ln|Blvd|Way|Ct|Pl)/.test(p));
      if (addrPart) {
        address = addrPart.replace(/-/g, " ");
        // Try to extract city from the address string
        const cityMatch = addrPart.match(/(?:St|Ave|Rd|Dr|Ln|Blvd|Way|Ct|Pl)-(.+?)-[A-Z]{2}-\d{5}/i);
        if (cityMatch) city = cityMatch[1].replace(/-/g, " ");
      }
    }
  } catch {}

  return { address, city, source };
}

export interface SearchResult {
  id: string;
  price: string;
  unformattedPrice: number;
  beds: number;
  baths: number;
  area: number;
  livingArea: number;
  homeType: string;
  address: { street: string; city: string; state: string; zipcode: string };
  latLong: { latitude: number; longitude: number };
  imgSrc: string;
  detailUrl: string;
  daysOnZillow: number;
}

export interface SearchResponse {
  success: boolean;
  totalCount: number;
  filteredCount: number;
  currentPage: string;
  results: SearchResult[];
}

export async function searchListingsByURL(
  zillowSearchUrl: string,
  page: number = 1
): Promise<SearchResponse> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const encodedUrl = encodeURIComponent(zillowSearchUrl);
  const response = await fetch(
    `https://real-estate101.p.rapidapi.com/api/search/byurl?url=${encodedUrl}&page=${page}`,
    {
      headers: {
        "x-rapidapi-host": "real-estate101.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RapidAPI request failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error("RapidAPI returned unsuccessful response");
  }

  return data as SearchResponse;
}

export async function searchListingsByLocation(
  location: string,
  options: {
    listType?: string;
    beds?: number;
    baths?: number;
    minPrice?: number;
    maxPrice?: number;
    page?: number;
  } = {}
): Promise<SearchResponse> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const params = new URLSearchParams();
  params.set("location", location);
  params.set("listType", options.listType || "for-rent");
  params.set("page", String(options.page || 1));
  if (options.beds) params.set("beds", String(options.beds));
  if (options.baths) params.set("baths", String(options.baths));
  if (options.minPrice) params.set("minPrice", String(options.minPrice));
  if (options.maxPrice) params.set("maxPrice", String(options.maxPrice));

  console.log(`[API] Zillow location search: ${location}, params: ${params.toString()}`);

  const response = await fetch(
    `https://real-estate101.p.rapidapi.com/api/search?${params.toString()}`,
    {
      headers: {
        "x-rapidapi-host": "real-estate101.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`RapidAPI location search failed (${response.status}): ${text}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || "Location search returned unsuccessful response");
  }

  return data as SearchResponse;
}

export async function searchRedfinListings(
  location: string,
  page: number = 1
): Promise<SearchResponse> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const encodedLocation = encodeURIComponent(location);
  const response = await fetch(
    `https://redfin-com-data.p.rapidapi.com/property/search-rent?location=${encodedLocation}&page=${page}`,
    {
      headers: {
        "x-rapidapi-host": "redfin-com-data.p.rapidapi.com",
        "x-rapidapi-key": apiKey,
      },
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Redfin RapidAPI request failed (${response.status}): ${text}`);
  }

  const data = await response.json();

  // Map Redfin response to our SearchResponse format
  const listings = data.data?.listings || data.listings || data.results || [];
  const results: SearchResult[] = listings.map((item: any, idx: number) => {
    const addr = item.address || {};
    return {
      id: item.listingId || item.propertyId || item.mlsId || `redfin-${idx}`,
      price: item.price ? `$${Number(item.price).toLocaleString()}/mo` : "N/A",
      unformattedPrice: Number(item.price) || 0,
      beds: item.beds || item.bedrooms || 0,
      baths: item.baths || item.bathrooms || 0,
      area: item.sqFt || item.sqft || item.area || 0,
      livingArea: item.sqFt || item.sqft || item.area || 0,
      homeType: item.propertyType || item.homeType || "Home",
      address: {
        street: addr.streetAddress || addr.street || item.streetAddress || "",
        city: addr.city || item.city || "",
        state: addr.state || item.state || "",
        zipcode: addr.zip || addr.zipcode || item.zip || "",
      },
      latLong: {
        latitude: item.latitude || item.lat || 0,
        longitude: item.longitude || item.lng || 0,
      },
      imgSrc: item.photoUrl || item.imgSrc || item.thumbnail || "",
      detailUrl: item.url || item.detailUrl || "",
      daysOnZillow: item.daysOnMarket || item.dom || 0,
    };
  });

  return {
    success: true,
    totalCount: data.data?.totalCount || data.totalCount || results.length,
    filteredCount: data.data?.filteredCount || data.filteredCount || results.length,
    currentPage: String(page),
    results,
  };
}

export async function scoreListing(
  listing: any,
  userPrefs: UserPreferences
): Promise<ScoringResult> {
  const priorities = userPrefs.priorities || [
    { criterion: "commute", weight: 0.35 },
    { criterion: "price", weight: 0.25 },
    { criterion: "safety", weight: 0.2 },
    { criterion: "walkability", weight: 0.1 },
    { criterion: "pet_friendly", weight: 0.1 },
  ];

  const mustHaves = userPrefs.must_haves || [];
  const niceToHaves = userPrefs.nice_to_haves || [];

  let mustHavePrompt = "";
  if (mustHaves.length > 0) {
    const mustHaveLabels = mustHaves.map(m => m.label).join(", ");
    mustHavePrompt = `
MUST-HAVES (Deal-Breakers): ${mustHaveLabels}
Analyze the listing description, features, and data fields carefully for each must-have.
If any must-have is clearly missing from the listing, the final score MUST be capped at 40.
List which must-haves are missing in "missing_must_haves" (array of label strings).
If all must-haves are present, "missing_must_haves" should be an empty array.`;
  }

  let niceToHavePrompt = "";
  if (niceToHaves.length > 0) {
    const niceToHaveLabels = niceToHaves.map(n => n.label).join(", ");
    niceToHavePrompt = `
NICE-TO-HAVES (Bonus Points): ${niceToHaveLabels}
Award up to +10 bonus points total for nice-to-have features that are present in the listing.
List which nice-to-haves are present in "present_nice_to_haves" (array of label strings).
If none are present, "present_nice_to_haves" should be an empty array.`;
  }

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Score this rental listing against the user's preferences. Return a 0-100 score for each criterion.

LISTING:
- Address: ${listing.address}, ${listing.city}
- Price: $${listing.price}/mo
- Bedrooms: ${listing.bedrooms}, Bathrooms: ${listing.bathrooms}
- Sqft: ${listing.sqft || "unknown"}
- Pet Policy: ${listing.pet_policy || "unknown"}
- Parking: ${listing.parking || "unknown"}
- Laundry: ${listing.laundry || "unknown"}
- Description: ${listing.description || "none"}

USER PREFERENCES:
- Commute to: ${userPrefs.commute_address || "not specified"}
- Budget: $${userPrefs.budget_min || 0} - $${userPrefs.budget_max || 99999}/mo
- Needs: ${userPrefs.bedrooms || "any"} BR / ${userPrefs.bathrooms || "any"} BA
- Pet friendly: ${userPrefs.pet_friendly ? "yes" : "no"}
- Priorities: ${JSON.stringify(priorities)}
${mustHavePrompt}
${niceToHavePrompt}

For each criterion, score 0-100 and explain briefly. Return ONLY valid JSON:
{
  "scores": {
    "criterion_name": {
      "score": 85,
      "reason": "brief explanation"
    }
  },
  "missing_must_haves": [],
  "present_nice_to_haves": [],
  "nice_to_have_bonus": 0
}

Score criteria contextually:
- commute: Based on estimated commute time from address to their workplace
- price: How well it fits their budget (at budget_min = 100, at budget_max = 60, over = lower)
- safety: Estimate based on neighborhood reputation
- walkability: Estimate based on area
- pet_friendly: Based on pet policy (100 if clearly pet friendly, 0 if no pets)
- schools: Based on area school quality
- parking: Based on parking availability
- size: Based on sqft and bedroom/bathroom match`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      const breakdown: ScoreBreakdown = {};
      let totalWeightedScore = 0;
      let totalWeight = 0;

      for (const priority of priorities) {
        const criterionScore = data.scores?.[priority.criterion];
        if (criterionScore) {
          const score = Math.min(100, Math.max(0, criterionScore.score));
          breakdown[priority.criterion] = {
            score,
            weight: priority.weight,
            weighted_score: score * priority.weight,
            reason: criterionScore.reason,
          };
          totalWeightedScore += score * priority.weight;
          totalWeight += priority.weight;
        }
      }

      let finalScore =
        totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;

      const missingMustHaves: string[] = data.missing_must_haves || [];
      const presentNiceToHaves: string[] = data.present_nice_to_haves || [];
      const niceToHaveBonus = Math.min(10, Math.max(0, data.nice_to_have_bonus || 0));
      let mustHaveCapped = false;

      // Cap score if must-haves are missing
      if (missingMustHaves.length > 0) {
        finalScore = Math.min(finalScore, 40);
        mustHaveCapped = true;
      }

      // Add nice-to-have bonus (but don't exceed 100)
      if (presentNiceToHaves.length > 0) {
        finalScore = Math.min(100, finalScore + niceToHaveBonus);
      }

      return {
        score: finalScore,
        breakdown,
        missing_must_haves: missingMustHaves,
        present_nice_to_haves: presentNiceToHaves,
        must_have_capped: mustHaveCapped,
      };
    }
  } catch (e) {
    console.error("Failed to parse scoring:", e);
  }

  return { score: 50, breakdown: {}, missing_must_haves: [], present_nice_to_haves: [], must_have_capped: false };
}

export async function generateNeighborhoodReport(
  address: string,
  commuteAddress?: string
): Promise<any> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Generate a comprehensive neighborhood report for this rental address. Use your knowledge of the area.

ADDRESS: ${address}
${commuteAddress ? `COMMUTE TO: ${commuteAddress}` : ""}

Return ONLY valid JSON:
{
  "commute_time": "estimated commute time by car and transit",
  "commute_distance": "estimated distance",
  "walk_score": estimated_0_to_100,
  "transit_score": estimated_0_to_100,
  "crime_summary": "brief safety assessment of the area",
  "parks_nearby": "notable parks within walking distance",
  "grocery_nearby": "grocery stores nearby",
  "schools_nearby": "notable schools in the area",
  "noise_level": "low/moderate/high with explanation",
  "ai_summary": "2-3 paragraph summary of what it's like to live here, including pros and cons for a renter"
}`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse neighborhood report:", e);
  }

  return {};
}

export async function generateComparison(
  listings: any[],
  userPrefs: UserPreferences
): Promise<string> {
  const listingSummaries = listings
    .map(
      (l, i) =>
        `${i + 1}. ${l.address}, ${l.city} — $${l.price}/mo, ${l.bedrooms}BR/${l.bathrooms}BA, Score: ${l.score}/100`
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 3000,
    messages: [
      {
        role: "user",
        content: `Compare these rental listings for a renter with these preferences:

PREFERENCES:
- Commute to: ${userPrefs.commute_address}
- Budget: $${userPrefs.budget_min}-$${userPrefs.budget_max}/mo
- Needs: ${userPrefs.bedrooms}BR/${userPrefs.bathrooms}BA
- Priorities: ${JSON.stringify(userPrefs.priorities)}

LISTINGS:
${listingSummaries}

Write a clear, helpful comparison in plain English. Structure it as:
1. Quick summary of each listing (2-3 sentences)
2. How they compare on each major criterion
3. Your recommendation and why

Be direct and opinionated — the renter wants help deciding, not a wishy-washy "it depends."`,
      },
    ],
  });

  return message.content[0].type === "text"
    ? message.content[0].text
    : "Unable to generate comparison.";
}

export async function generateAdvisorResponse(
  question: string,
  listings: any[],
  userPrefs: UserPreferences
): Promise<string> {
  const context = listings
    .slice(0, 10)
    .map(
      (l) =>
        `- ${l.address}, ${l.city}: $${l.price}/mo, ${l.bedrooms}BR/${l.bathrooms}BA, Score: ${l.score}/100, Status: ${l.status}`
    )
    .join("\n");

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `You are Zubia, an AI rental advisor. You're helping a renter find their next home in the Bay Area.

THEIR PREFERENCES:
- Commute to: ${userPrefs.commute_address}
- Budget: $${userPrefs.budget_min}-$${userPrefs.budget_max}/mo
- Needs: ${userPrefs.bedrooms}BR/${userPrefs.bathrooms}BA
- Priorities: ${JSON.stringify(userPrefs.priorities)}

THEIR SAVED LISTINGS:
${context || "No listings saved yet."}

THEIR QUESTION: ${question}

Answer helpfully and directly. Be opinionated when asked for recommendations. Reference their specific listings and scores when relevant. Keep it conversational but substantive.`,
      },
    ],
  });

  return message.content[0].type === "text"
    ? message.content[0].text
    : "I'm having trouble responding right now. Please try again.";
}

export async function detectScamRisk(
  listing: any
): Promise<{ risk_score: number; reasons: string[] }> {
  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1000,
    messages: [
      {
        role: "user",
        content: `Analyze this rental listing for potential scam red flags. Score the risk 0-100 (0 = safe, 100 = definite scam).

LISTING:
- Address: ${listing.address}, ${listing.city}
- Price: $${listing.price}/mo
- ${listing.bedrooms}BR/${listing.bathrooms}BA, ${listing.sqft || "unknown"} sqft
- Source: ${listing.source}
- Description: ${listing.description || "none"}
- Landlord: ${listing.landlord_name || "unknown"}
- Contact: ${listing.landlord_contact || "unknown"}

Common red flags: price way below market, no photos, urgency pressure, wire transfer requests, can't tour before signing, out-of-area landlord, copied descriptions, too-good-to-be-true amenities.

Return ONLY valid JSON:
{
  "risk_score": number_0_to_100,
  "reasons": ["array of specific red flags or green flags found"]
}`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.error("Failed to parse scam detection:", e);
  }

  return { risk_score: 0, reasons: ["Unable to analyze"] };
}
