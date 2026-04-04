import React, { useState } from "react";
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

export default function AddListing({ onNavigate }: AddListingProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchUrl, setSearchUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number } | null>(null);

  const handleSearch = async (page: number = 1) => {
    const input = url.trim();
    if (!input) return;
    setLoading(true);
    setError(null);
    setImportResult(null);
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
        body: JSON.stringify({ url: input, page }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data.results || []);
        setTotalCount(data.totalCount || 0);
        setFilteredCount(data.filteredCount || 0);
        setCurrentPage(data.currentPage || 1);
        setSearchUrl(input);
        // Auto-select all by default
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
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
    handleSearch(page);
  };

  return (
    <div className="page add-page">
      <div className="page-header">
        <div>
          <h1>Import Listings</h1>
          <p className="text-secondary">
            Search Zillow or Redfin with your filters, then import the results
          </p>
        </div>
      </div>

      <div className="add-form-card">
        <div className="add-url-row">
          <div className="add-url-input">
            <Icons.Search />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Zillow or Redfin URL, or type a location to search Redfin..."
              className="input-field input-lg"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={() => handleSearch()}
            disabled={loading || !url.trim()}
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <p className="text-secondary" style={{ fontSize: "13px", marginTop: "8px" }}>
          Paste a Zillow or Redfin search URL, or type a location (e.g. "San Francisco, CA") to search Redfin rentals
        </p>

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

        {error && (
          <div className="error-card">
            <Icons.Warning />
            <p>{error}</p>
          </div>
        )}

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
                  <div
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      paddingTop: "4px",
                    }}
                  >
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
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                      }}
                    >
                      <div>
                        <h3 style={{ margin: 0, fontSize: "15px" }}>
                          {r.address.street}
                        </h3>
                        <p
                          className="text-secondary"
                          style={{ margin: "2px 0 0", fontSize: "13px" }}
                        >
                          {r.address.city}, {r.address.state} {r.address.zipcode}
                        </p>
                      </div>
                      <ScoreBadge score={r.score || 0} size="small" />
                    </div>

                    <div
                      style={{
                        display: "flex",
                        gap: "16px",
                        marginTop: "8px",
                        fontSize: "14px",
                        flexWrap: "wrap",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{r.price}</span>
                      <span>{r.beds} bd</span>
                      <span>{r.baths} ba</span>
                      <span>{(r.livingArea || r.area || 0).toLocaleString()} sqft</span>
                      {r.daysOnZillow > 0 && (
                        <span className="text-secondary">
                          {r.daysOnZillow}d on market
                        </span>
                      )}
                      <span className="text-secondary">{r.homeType}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: "8px",
                marginTop: "16px",
              }}
            >
              {currentPage > 1 && (
                <button
                  className="btn btn-ghost"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={loading}
                >
                  Previous
                </button>
              )}
              <span
                className="text-secondary"
                style={{ display: "flex", alignItems: "center", fontSize: "14px" }}
              >
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

            {/* Bulk save button */}
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
    </div>
  );
}
