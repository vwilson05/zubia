import React, { useEffect, useState } from "react";
import { Icons, ScoreBadge } from "./Icons";

function renderMarkdown(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    // Headers
    .replace(/^### (.+)$/gm, '<h4>$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="md-h3">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="md-h2">$1</h2>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Paragraphs (double newline)
    .replace(/\n\n/g, '</p><p>')
    // Single newlines within paragraphs
    .replace(/\n/g, '<br/>')
    // Wrap in paragraph
    .replace(/^/, '<p>')
    .replace(/$/, '</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    .replace(/<p>\s*<h/g, '<h')
    .replace(/<\/h[234]>\s*<\/p>/g, m => m.replace('</p>', ''));
}

export default function Compare() {
  const [listings, setListings] = useState<any[]>([]);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [comparison, setComparison] = useState<string | null>(null);
  const [comparisonListings, setComparisonListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [savedComparisons, setSavedComparisons] = useState<any[]>([]);
  const [boardName, setBoardName] = useState("");

  useEffect(() => {
    fetch("/api/listings").then(r => r.json()).then(setListings);
    fetch("/api/comparisons").then(r => r.json()).then(setSavedComparisons);
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  const handleCompare = async () => {
    if (selectedIds.length < 2) return;
    setLoading(true);
    setComparison(null);

    const res = await fetch("/api/compare", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listing_ids: selectedIds, name: boardName || null }),
    });
    const data = await res.json();
    setComparison(data.comparison);
    setComparisonListings(data.listings || []);
    setLoading(false);
  };

  const loadSavedComparison = (comp: any) => {
    setSelectedIds(comp.listing_ids);
    setBoardName(comp.name);
  };

  const criteria = ["commute", "price", "safety", "walkability", "pet_friendly"];

  return (
    <div className="page compare-page">
      <div className="page-header">
        <div>
          <p className="text-secondary">Select 2-5 listings to compare side-by-side</p>
        </div>
      </div>

      {/* Saved Comparisons */}
      {savedComparisons.length > 0 && (
        <div className="saved-comparisons">
          <h3>Saved Comparisons</h3>
          <div className="saved-comp-list">
            {savedComparisons.map(c => (
              <button key={c.id} className="btn btn-outline btn-sm" onClick={() => loadSavedComparison(c)}>
                {c.name} ({c.listing_ids?.length || 0} listings)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Listing Selection */}
      <div className="compare-select-section">
        <h3>Select Listings ({selectedIds.length}/5)</h3>
        <div className="compare-listing-grid">
          {listings.map(listing => (
            <div
              key={listing.id}
              className={`compare-select-card ${selectedIds.includes(listing.id) ? "selected" : ""}`}
              onClick={() => toggleSelect(listing.id)}
            >
              <div className="compare-select-check">
                {selectedIds.includes(listing.id) && <Icons.Check />}
              </div>
              <div className="compare-select-info">
                <h4>{listing.address}</h4>
                <p className="text-secondary">{listing.city}</p>
                <span className="price">${listing.price?.toLocaleString()}/mo</span>
              </div>
              <ScoreBadge score={listing.score || 0} size="small" />
            </div>
          ))}
        </div>

        <div className="compare-actions">
          <input
            type="text"
            placeholder="Board name (optional)"
            value={boardName}
            onChange={e => setBoardName(e.target.value)}
            className="input-field"
          />
          <button
            className="btn btn-primary"
            onClick={handleCompare}
            disabled={selectedIds.length < 2 || loading}
          >
            {loading ? "Comparing..." : `Compare ${selectedIds.length} Listings`}
          </button>
        </div>
      </div>

      {/* Comparison Matrix */}
      {comparisonListings.length > 0 && (
        <div className="comparison-matrix-section">
          <h3>Comparison Matrix</h3>
          <div className="comparison-table-wrapper">
            <table className="comparison-table">
              <thead>
                <tr>
                  <th>Criterion</th>
                  {comparisonListings.map(l => (
                    <th key={l.id}>
                      <div className="comp-listing-header">
                        <span>{l.address}</span>
                        <span className="text-secondary">{l.city}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="criterion-label">Overall Score</td>
                  {comparisonListings.map(l => (
                    <td key={l.id}>
                      <ScoreBadge score={l.score || 0} size="small" />
                    </td>
                  ))}
                </tr>
                <tr>
                  <td className="criterion-label">Price</td>
                  {comparisonListings.map(l => (
                    <td key={l.id} className="comp-value">${l.price?.toLocaleString()}/mo</td>
                  ))}
                </tr>
                <tr>
                  <td className="criterion-label">Size</td>
                  {comparisonListings.map(l => (
                    <td key={l.id} className="comp-value">{l.bedrooms}BR/{l.bathrooms}BA</td>
                  ))}
                </tr>
                {criteria.map(c => (
                  <tr key={c}>
                    <td className="criterion-label">{c}</td>
                    {comparisonListings.map(l => {
                      const breakdown = l.score_breakdown || {};
                      const val = breakdown[c];
                      return (
                        <td key={l.id}>
                          {val ? (
                            <div className="comp-score-cell" style={{
                              backgroundColor: val.score >= 80 ? "rgba(16,185,129,0.1)" : val.score >= 60 ? "rgba(245,158,11,0.1)" : "rgba(249,112,102,0.1)",
                              color: val.score >= 80 ? "var(--success)" : val.score >= 60 ? "var(--warning)" : "var(--accent)",
                            }}>
                              {val.score}
                            </div>
                          ) : (
                            <span className="text-secondary">-</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI Summary */}
      {comparison && (
        <div className="comparison-summary">
          <h3>AI Analysis</h3>
          <div className="ai-summary-content" dangerouslySetInnerHTML={{ __html: renderMarkdown(comparison) }} />
        </div>
      )}

      {loading && (
        <div className="loading-card">
          <div className="loading-spinner" />
          <p>Generating AI comparison...</p>
        </div>
      )}
    </div>
  );
}
