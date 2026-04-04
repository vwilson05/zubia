import React, { useState } from "react";
import { Icons, ScoreBadge } from "./Icons";

interface AddListingProps {
  onNavigate: (page: any) => void;
}

export default function AddListing({ onNavigate }: AddListingProps) {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const handleAnalyze = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setSaved(false);
    setLoadingStep(1);

    // Simulate loading steps
    const timer1 = setTimeout(() => setLoadingStep(2), 3000);
    const timer2 = setTimeout(() => setLoadingStep(3), 6000);

    try {
      const res = await fetch("/api/listings/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
        setSaved(true); // Auto-saved
      }
    } catch (e: any) {
      setError(e.message || "Failed to analyze listing");
    }

    clearTimeout(timer1);
    clearTimeout(timer2);
    setLoading(false);
    setLoadingStep(0);
  };

  return (
    <div className="page add-page">
      <div className="page-header">
        <div>
          <h1>Add Listing</h1>
          <p className="text-secondary">Paste a URL from any listing site</p>
        </div>
      </div>

      <div className="add-form-card">
        <div className="add-url-row">
          <div className="add-url-input">
            <Icons.Link />
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="Paste a Zillow, Redfin, Craigslist, or any listing URL..."
              className="input-field input-lg"
              onKeyDown={(e) => e.key === "Enter" && handleAnalyze()}
            />
          </div>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleAnalyze}
            disabled={loading || !url.trim()}
          >
            {loading ? "Analyzing..." : "Analyze"}
          </button>
        </div>

        {loading && (
          <div className="loading-card">
            <div className="loading-spinner" />
            <div className="loading-steps">
              <p className={`loading-step ${loadingStep >= 1 ? "active" : ""}`}>
                <Icons.Search /> Extracting listing data...
              </p>
              <p className={`loading-step ${loadingStep >= 2 ? "active" : ""}`}>
                <Icons.Score /> Scoring against your criteria...
              </p>
              <p className={`loading-step ${loadingStep >= 3 ? "active" : ""}`}>
                <Icons.Shield /> Checking for red flags...
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

        {result && result.listing && (
          <div className="result-card">
            <div className="result-header">
              <div className="result-title">
                <h2>{result.listing.address || "Address"}</h2>
                <p className="text-secondary">{result.listing.city} {result.listing.neighborhood ? `- ${result.listing.neighborhood}` : ""}</p>
                <span className="source-badge">{result.listing.source}</span>
              </div>
              <ScoreBadge score={result.listing.score || 0} size="large" />
            </div>

            <div className="result-details-grid">
              <div className="result-detail">
                <span className="detail-label">Price</span>
                <span className="detail-value">${result.listing.price?.toLocaleString()}/mo</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Bedrooms</span>
                <span className="detail-value">{result.listing.bedrooms || "?"}</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Bathrooms</span>
                <span className="detail-value">{result.listing.bathrooms || "?"}</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Sqft</span>
                <span className="detail-value">{result.listing.sqft?.toLocaleString() || "?"}</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Parking</span>
                <span className="detail-value">{result.listing.parking || "?"}</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Laundry</span>
                <span className="detail-value">{result.listing.laundry || "?"}</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Pet Policy</span>
                <span className="detail-value">{result.listing.pet_policy || "?"}</span>
              </div>
              <div className="result-detail">
                <span className="detail-label">Available</span>
                <span className="detail-value">{result.listing.available_date || "?"}</span>
              </div>
            </div>

            {result.listing.description && (
              <div className="result-description">
                <h3>Description</h3>
                <p>{result.listing.description}</p>
              </div>
            )}

            {/* Score Breakdown */}
            {result.listing.score_breakdown && Object.keys(result.listing.score_breakdown).length > 0 && (
              <div className="score-breakdown-section">
                <h3>Score Breakdown</h3>
                <div className="breakdown-list">
                  {Object.entries(result.listing.score_breakdown).map(([key, val]: [string, any]) => (
                    <div key={key} className="breakdown-row">
                      <div className="breakdown-label-row">
                        <span className="breakdown-label">{key}</span>
                        <span className="breakdown-weight">({Math.round(val.weight * 100)}% weight)</span>
                      </div>
                      <div className="breakdown-bar-track">
                        <div
                          className="breakdown-bar-fill"
                          style={{
                            width: `${val.score}%`,
                            backgroundColor: val.score >= 80 ? "var(--success)" : val.score >= 60 ? "var(--warning)" : "var(--accent)",
                          }}
                        />
                      </div>
                      <span className="breakdown-value">{val.score}</span>
                      {val.reason && <p className="breakdown-reason">{val.reason}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Scam Risk */}
            {result.scam_risk && (
              <div className={`scam-card ${result.scam_risk.risk_score > 50 ? "scam-high" : result.scam_risk.risk_score > 20 ? "scam-medium" : "scam-low"}`}>
                <div className="scam-header">
                  <Icons.Shield />
                  <h3>Scam Risk: {result.scam_risk.risk_score}/100</h3>
                </div>
                <ul className="scam-reasons">
                  {result.scam_risk.reasons?.map((r: string, i: number) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              </div>
            )}

            {saved && (
              <div className="save-confirmation">
                <Icons.Check />
                <span>Saved to your listings</span>
                <button className="btn btn-ghost" onClick={() => onNavigate("listings")}>
                  View Listings <Icons.ArrowRight />
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
