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
}

interface ScoreBreakdown {
  [criterion: string]: {
    score: number;
    weight: number;
    weighted_score: number;
    reason: string;
  };
}

export async function extractListingFromURL(url: string): Promise<ListingData> {
  // Try to fetch page content. Sites like Zillow block server-side requests,
  // so we also extract what we can from the URL structure itself.
  let pageContent = "";
  let fetchFailed = false;
  try {
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
    });
    const text = await response.text();
    // Check if we got actual content or just a JS shell
    if (text.length > 1000 && (text.includes("bedrooms") || text.includes("price") || text.includes("rent") || text.includes("sqft") || text.includes("bath"))) {
      pageContent = text.substring(0, 50000);
    } else {
      fetchFailed = true;
      pageContent = `[Page content was blocked or requires JavaScript rendering. Extract data from URL structure and any metadata available.]`;
    }
  } catch (e) {
    fetchFailed = true;
    pageContent = `[Failed to fetch: ${e}]`;
  }

  // Extract info from URL structure (Zillow, Redfin encode address in URL)
  let urlHints = "";
  try {
    const urlPath = new URL(url).pathname;
    // Zillow: /homedetails/742-Castro-St-San-Francisco-CA-94114/15063122_zpid/
    // Redfin: /CA/San-Francisco/742-Castro-St-94114/home/1234567
    const addressMatch = urlPath.match(/\/(\d+[-\w]+-(?:St|Ave|Rd|Dr|Ln|Blvd|Way|Ct|Pl|Cir|Ter|Loop)[-\w]*)/i);
    if (addressMatch) {
      const addr = addressMatch[1].replace(/-/g, " ");
      urlHints += `Address from URL: ${addr}\n`;
    }
    // Extract city/state from URL
    const parts = urlPath.split("/").filter(Boolean);
    if (parts.length > 2) {
      urlHints += `URL path parts: ${parts.join(", ")}\n`;
    }
  } catch {}

  if (urlHints) {
    pageContent += `\n\nURL-derived hints:\n${urlHints}`;
  }

  // Detect source from URL
  let source = "other";
  if (url.includes("zillow.com")) source = "zillow";
  else if (url.includes("redfin.com")) source = "redfin";
  else if (url.includes("craigslist.org")) source = "craigslist";
  else if (url.includes("apartments.com")) source = "apartments";

  const message = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2000,
    messages: [
      {
        role: "user",
        content: `Extract structured rental listing data from this URL and any available page content.

URL: ${url}
Source platform: ${source}
${fetchFailed ? "NOTE: The page could not be fully fetched (JavaScript rendering required). Extract what you can from the URL structure, metadata, and any partial content below." : ""}

Page content:
${pageContent}

IMPORTANT: Even if page content is limited, extract what you can from the URL itself. Zillow and Redfin encode the address in the URL path (e.g., /homedetails/742-Castro-St-San-Francisco-CA-94114/). Parse the address, city, and state from the URL.

Return ONLY valid JSON with these fields (use null for truly unavailable data, but try hard to extract the address):
{
  "address": "full street address",
  "city": "city name",
  "neighborhood": "neighborhood if mentioned",
  "price": monthly_rent_as_number,
  "bedrooms": number,
  "bathrooms": number,
  "sqft": square_footage_as_number,
  "description": "brief description of the property",
  "pet_policy": "pet policy details or null",
  "parking": "parking details or null",
  "laundry": "laundry details or null",
  "available_date": "move-in date or null",
  "landlord_name": "landlord/property manager name or null",
  "landlord_contact": "contact info or null",
  "photos": ["array of photo URLs found"]
}`,
      },
    ],
  });

  try {
    const text =
      message.content[0].type === "text" ? message.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const data = JSON.parse(jsonMatch[0]);
      data.source = source;
      return data;
    }
  } catch (e) {
    console.error("Failed to parse listing extraction:", e);
  }

  return { source };
}

export async function scoreListing(
  listing: any,
  userPrefs: UserPreferences
): Promise<{ score: number; breakdown: ScoreBreakdown }> {
  const priorities = userPrefs.priorities || [
    { criterion: "commute", weight: 0.35 },
    { criterion: "price", weight: 0.25 },
    { criterion: "safety", weight: 0.2 },
    { criterion: "walkability", weight: 0.1 },
    { criterion: "pet_friendly", weight: 0.1 },
  ];

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

For each criterion, score 0-100 and explain briefly. Return ONLY valid JSON:
{
  "scores": {
    "criterion_name": {
      "score": 85,
      "reason": "brief explanation"
    }
  }
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

      const finalScore =
        totalWeight > 0 ? Math.round(totalWeightedScore / totalWeight) : 50;
      return { score: finalScore, breakdown };
    }
  } catch (e) {
    console.error("Failed to parse scoring:", e);
  }

  return { score: 50, breakdown: {} };
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
