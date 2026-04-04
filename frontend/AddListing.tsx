import React, { useState, useEffect } from "react";
import { Icons, ScoreBadge } from "./Icons";

interface AddListingProps {
  onNavigate: (page: any) => void;
}

interface SearchResultItem {
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
  score: number;
  scoreBreakdown: any;
}

interface CriteriaItem {
  id: string;
  label: string;
  type: "preset" | "custom";
}

interface UserPreferences {
  budget_min?: number;
  budget_max?: number;
  bedrooms?: number;
  bathrooms?: number;
  must_haves?: CriteriaItem[];
  nice_to_haves?: CriteriaItem[];
}

export default function AddListing({ onNavigate }: AddListingProps) {
  // Search state
  const [location, setLocation] = useState("");
  const [beds, setBeds] = useState("");
  const [baths, setBaths] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [mustHaves, setMustHaves] = useState<CriteriaItem[]>([]);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

  // Search results state
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);
  const [lastSearchSource, setLastSearchSource] = useState<"zillow" | "redfin">("zillow");

  // Paste URL state
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteLoading, setPasteLoading] = useState(false);
  const [pasteError, setPasteError] = useState<string | null>(null);
  const [pasteSuccess, setPasteSuccess] = useState(false);

  // Load user preferences on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/preferences");
        const prefs: UserPreferences = await res.json();
        if (prefs.bedrooms) setBeds(String(prefs.bedrooms));
        if (prefs.bathrooms) setBaths(String(prefs.bathrooms));
        if (prefs.budget_min) setMinPrice(String(prefs.budget_min));
        if (prefs.budget_max) setMaxPrice(String(prefs.budget_max));
        if (prefs.must_haves && prefs.must_haves.length > 0) setMustHaves(prefs.must_haves);
        setPrefsLoaded(true);
      } catch {
        setPrefsLoaded(true);
      }
    })();
  }, []);

  const handleSearch = async (source: "zillow" | "redfin", page: number = 1) => {
    const loc = location.trim();
    if (!loc) return;
    setLoading(true);
    setError(null);
    setImportResult(null);
    setLastSearchSource(source);
    if (page === 1) {
      setResults([]);
      setSelected(new Set());
    }
    setLoadingStep(1);

    const timer1 = setTimeout(() => setLoadingStep(2), 3000);
    const timer2 = setTimeout(() => setLoadingStep(3), 8000);

    try {
      const res = await fetch("/api/listings/import-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: loc,
          source,
          beds: beds || undefined,
          baths: baths || undefined,
          minPrice: minPrice ? parseInt(minPrice) : undefined,
          maxPrice: maxPrice ? parseInt(maxPrice) : undefined,
          page,
        }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results || []);
        setTotalCount(data.totalCount || 0);
        setFilteredCount(data.filteredCount || 0);
        setCurrentPage(data.currentPage || 1);
        const allIds = new Set((data.results || []).map((r: SearchResultItem) => r.id));
        setSelected(allIds);
      }
    } catch (e: any) {
      setError(e.message || "Failed to search");
    }

    clearTimeout(timer1);
    clearTimeout(timer2);
    setLoading(false);
    setLoadingStep(0);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === results.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(results.map((r) => r.id)));
    }
  };

  const handleBulkSave = async () => {
    const selectedListings = results.filter((r) => selected.has(r.id));
    if (selectedListings.length === 0) return;
    setSaving(true);
    setError(null);

    try {
      const res = await fetch("/api/listings/bulk-save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listings: selectedListings }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setImportResult({ count: data.count });
      }
    } catch (e: any) {
      setError(e.message || "Failed to save listings");
    }
    setSaving(false);
  };

  const handlePageChange = (page: number) => {
    handleSearch(lastSearchSource, page);
  };

  const handlePasteAdd = async () => {
    const u = pasteUrl.trim();
    if (!u) return;
    setPasteLoading(true);
    setPasteError(null);
    setPasteSuccess(false);

    try {
      const res = await fetch("/api/listings/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: u }),
      });
      const data = await res.json();
      if (data.error) {
        setPasteError(data.error);
      } else {
        setPasteSuccess(true);
        setPasteUrl("");
      }
    } catch (e: any) {
      setPasteError(e.message || "Failed to add listing");
    }
    setPasteLoading(false);
  };

  return (
    <div className="page add-page">
      <div className="page-header">
        <div>
          <h1>Add Listings</h1>
          <p className="text-secondary">
            Search rentals or paste a URL to import listings
          </p>
        </div>
      </div>

      {/* ---- SECTION 1: Search Rentals ---- */}
      <div className="add-form-card">
        <h2 className="search-section-title">Search Rentals</h2>
        <p className="text-secondary" style={{ fontSize: "13px", marginBottom: "20px" }}>
          Searches use your preferences from Settings. Results scored against your criteria.
        </p>

        {/* Location input */}
        <div className="search-location-row">
          <div className="add-url-input" style={{ flex: 1 }}>
            <Icons.Search />
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder='Enter a location (e.g. "San Jose, CA" or "Mountain View")'
              className="input-field input-lg"
              onKeyDown={(e) => e.key === "Enter" && handleSearch("zillow")}
            />
          </div>
        </div>

        {/* Filters row */}
        <div className="search-filters-row">
          <div className="search-filter-group">
            <label className="search-filter-label">Bedrooms</label>
            <select
              value={beds}
              onChange={(e) => setBeds(e.target.value)}
              className="input-field search-filter-select"
            >
              <option value="">Any</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
              <option value="5">5+</option>
            </select>
          </div>

          <div className="search-filter-group">
            <label className="search-filter-label">Bathrooms</label>
            <select
              value={baths}
              onChange={(e) => setBaths(e.target.value)}
              className="input-field search-filter-select"
            >
              <option value="">Any</option>
              <option value="1">1</option>
              <option value="1.5">1.5</option>
              <option value="2">2</option>
              <option value="2.5">2.5</option>
              <option value="3">3+</option>
            </select>
          </div>

          <div className="search-filter-group">
            <label className="search-filter-label">Min Price</label>
            <input
              type="number"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
              placeholder="$0"
              className="input-field search-filter-input"
            />
          </div>

          <div className="search-filter-group">
            <label className="search-filter-label">Max Price</label>
            <input
              type="number"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
              placeholder="No max"
              className="input-field search-filter-input"
            />
          </div>
        </div>

        {/* Must-haves pills */}
        {mustHaves.length > 0 && (
          <div className="search-must-haves">
            <span className="search-must-haves-label">Must-haves:</span>
            {mustHaves.map((mh) => (
              <span key={mh.id} className="search-pill">{mh.label}</span>
            ))}
            <button
              className="btn btn-ghost"
              style={{ fontSize: "12px", padding: "2px 8px" }}
              onClick={() => onNavigate("settings")}
            >
              Edit in Settings
            </button>
          </div>
        )}

        {/* Search buttons */}
        <div className="search-buttons-row">
          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleSearch("zillow")}
            disabled={loading || !location.trim()}
          >
            {loading && lastSearchSource === "zillow" ? "Searching..." : "Search Zillow"}
          </button>
          <button
            className="btn btn-outline btn-lg"
            onClick={() => handleSearch("redfin")}
            disabled={loading || !location.trim()}
          >
            {loading && lastSearchSource === "redfin" ? "Searching..." : "Search Redfin"}
          </button>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="loading-card">
            <div className="loading-spinner" />
            <div className="loading-steps">
              <p className={`loading-step ${loadingStep >= 1 ? "active" : ""}`}>
                <Icons.Search /> Fetching search results...
              </p>
              <p className={`loading-step ${loadingStep >= 2 ? "active" : ""}`}>
                <Icons.Score /> Scoring each listing against your criteria...
              </p>
              <p className={`loading-step ${loadingStep >= 3 ? "active" : ""}`}>
                <Icons.Check /> Almost done...
              </p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="error-card">
            <Icons.Warning />
            <p>{error}</p>
          </div>
        )}

        {/* Import success */}
        {importResult && (
          <div className="save-confirmation" style={{ marginTop: "16px", padding: "16px" }}>
            <Icons.Check />
            <span>Imported {importResult.count} listings!</span>
            <button
              className="btn btn-ghost"
              onClick={() => onNavigate("listings")}
            >
              View Dashboard <Icons.ArrowRight />
            </button>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && !importResult && (
          <div className="search-results-section" style={{ marginTop: "24px" }}>
            <div
              className="search-results-header"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "16px",
              }}
            >
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>
                  {filteredCount} results found
                </h2>
                <p className="text-secondary" style={{ margin: "4px 0 0", fontSize: "13px" }}>
                  Page {currentPage} -- Showing {results.length} listings
                </p>
              </div>
              <button className="btn btn-ghost" onClick={toggleAll}>
                {selected.size === results.length ? "Deselect All" : "Select All"}
              </button>
            </div>

            <div
              className="search-results-list"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                maxHeight: "600px",
                overflowY: "auto",
              }}
            >
              {results.map((r) => (
                <div
                  key={r.id}
                  className="search-result-card"
                  onClick={() => toggleSelect(r.id)}
                  style={{
                    display: "flex",
                    gap: "16px",
                    padding: "12px",
                    border: selected.has(r.id)
                      ? "2px solid var(--primary)"
                      : "2px solid var(--border)",
                    borderRadius: "12px",
                    cursor: "pointer",
                    background: selected.has(r.id)
                      ? "var(--primary-bg, rgba(15, 118, 110, 0.05))"
                      : "var(--card-bg, #fff)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", paddingTop: "4px" }}>
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleSelect(r.id)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ width: "18px", height: "18px", cursor: "pointer" }}
                    />
                  </div>

                  {r.imgSrc && (
                    <img
                      src={r.imgSrc}
                      alt={r.address.street}
                      style={{
                        width: "120px",
                        height: "90px",
                        objectFit: "cover",
                        borderRadius: "8px",
                        flexShrink: 0,
                      }}
                    />
                  )}

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <h3 style={{ margin: 0, fontSize: "15px" }}>{r.address.street}</h3>
                        <p className="text-secondary" style={{ margin: "2px 0 0", fontSize: "13px" }}>
                          {r.address.city}, {r.address.state} {r.address.zipcode}
                        </p>
                      </div>
                      <ScoreBadge score={r.score || 0} size="small" />
                    </div>

                    <div style={{ display: "flex", gap: "16px", marginTop: "8px", fontSize: "14px", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>{r.price}</span>
                      <span>{r.beds} bd</span>
                      <span>{r.baths} ba</span>
                      <span>{(r.livingArea || r.area || 0).toLocaleString()} sqft</span>
                      {r.daysOnZillow > 0 && (
                        <span className="text-secondary">{r.daysOnZillow}d on market</span>
                      )}
                      <span className="text-secondary">{r.homeType}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "16px" }}>
              {currentPage > 1 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={loading}
                >
                  Previous
                </button>
              )}
              <span className="text-secondary" style={{ display: "flex", alignItems: "center", fontSize: "14px" }}>
                Page {currentPage}
              </span>
              {results.length >= 40 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={loading}
                >
                  Next
                </button>
              )}
            </div>

            {/* Bulk save */}
            <div style={{ marginTop: "20px" }}>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: "100%" }}
                onClick={handleBulkSave}
                disabled={saving || selected.size === 0}
              >
                {saving
                  ? "Importing..."
                  : `Import ${selected.size} Selected Listing${selected.size !== 1 ? "s" : ""}`}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ---- DIVIDER ---- */}
      <div className="search-section-divider">
        <span>or</span>
      </div>

      {/* ---- SECTION 2: Paste URL ---- */}
      <div className="add-form-card">
        <h2 className="search-section-title">Add a Listing You Found</h2>
        <p className="text-secondary" style={{ fontSize: "13px", marginBottom: "20px" }}>
          Works with Zillow, Redfin, and most rental sites
        </p>

        <div className="add-url-row">
          <div className="add-url-input">
            <Icons.Search />
            <input
              type="text"
              value={pasteUrl}
              onChange={(e) => setPasteUrl(e.target.value)}
              placeholder="Paste a listing URL..."
              className="input-field input-lg"
              onKeyDown={(e) => e.key === "Enter" && handlePasteAdd()}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handlePasteAdd}
            disabled={pasteLoading || !pasteUrl.trim()}
          >
            {pasteLoading ? "Adding..." : "Add Listing"}
          </button>
        </div>

        {pasteError && (
          <div className="error-card">
            <Icons.Warning />
            <p>{pasteError}</p>
          </div>
        )}

        {pasteSuccess && (
          <div className="save-confirmation" style={{ marginTop: "16px", padding: "16px" }}>
            <Icons.Check />
            <span>Listing added and scored!</span>
            <button
              className="btn btn-ghost"
              onClick={() => onNavigate("listings")}
            >
              View Dashboard <Icons.ArrowRight />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
