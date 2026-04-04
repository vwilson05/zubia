import React, { useEffect, useState } from "react";
import { Icons, ScoreBadge, StatusPill } from "./Icons";

interface ListingsProps {
  onNavigate: (page: any) => void;
}

export default function Listings({ onNavigate }: ListingsProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("score");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [neighborhoodReport, setNeighborhoodReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = () => {
    fetch("/api/listings").then(r => r.json()).then(setListings);
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/listings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchListings();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Remove this listing?")) return;
    await fetch(`/api/listings/${id}`, { method: "DELETE" });
    fetchListings();
  };

  const loadNeighborhoodReport = async (id: number) => {
    setLoadingReport(true);
    const res = await fetch(`/api/listings/${id}/neighborhood`);
    const data = await res.json();
    setNeighborhoodReport(data);
    setLoadingReport(false);
  };

  const sorted = [...listings].sort((a, b) => {
    if (sortBy === "score") return (b.score || 0) - (a.score || 0);
    if (sortBy === "price") return (a.price || 0) - (b.price || 0);
    if (sortBy === "date") return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    return 0;
  });

  const filtered = sorted.filter(l => {
    if (filterStatus !== "all" && l.status !== filterStatus) return false;
    if (l.score < filterMinScore) return false;
    return true;
  });

  return (
    <div className="page listings-page">
      <div className="page-header">
        <div>
          <h1>My Listings</h1>
          <p className="text-secondary">{filtered.length} listings</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate("add")}>
          <Icons.Add /> Add Listing
        </button>
      </div>

      {/* Controls */}
      <div className="listings-controls">
        <div className="controls-left">
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="select-field">
            <option value="score">Sort by Score</option>
            <option value="price">Sort by Price</option>
            <option value="date">Sort by Date Added</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-field">
            <option value="all">All Statuses</option>
            <option value="saved">Saved</option>
            <option value="applied">Applied</option>
            <option value="toured">Toured</option>
            <option value="rejected">Rejected</option>
          </select>
          <div className="min-score-filter">
            <label>Min Score:</label>
            <input
              type="number"
              min="0"
              max="100"
              value={filterMinScore}
              onChange={e => setFilterMinScore(parseInt(e.target.value) || 0)}
              className="input-field input-sm"
            />
          </div>
        </div>
        <div className="controls-right">
          <button className={`icon-btn ${view === "grid" ? "active" : ""}`} onClick={() => setView("grid")}>
            <Icons.Grid />
          </button>
          <button className={`icon-btn ${view === "list" ? "active" : ""}`} onClick={() => setView("list")}>
            <Icons.List />
          </button>
        </div>
      </div>

      {/* Listings */}
      <div className={`listings-container listings-${view}`}>
        {filtered.map(listing => (
          <div
            key={listing.id}
            className={`listing-card ${expandedId === listing.id ? "expanded" : ""}`}
          >
            <div className="listing-card-main" onClick={() => {
              if (expandedId === listing.id) {
                setExpandedId(null);
                setNeighborhoodReport(null);
              } else {
                setExpandedId(listing.id);
                loadNeighborhoodReport(listing.id);
              }
            }}>
              <div className="listing-card-photo">
                <Icons.Neighborhood />
              </div>
              <div className="listing-card-body">
                <div className="listing-card-top">
                  <div>
                    <h3>{listing.address}</h3>
                    <p className="text-secondary">{listing.city} {listing.neighborhood ? `- ${listing.neighborhood}` : ""}</p>
                  </div>
                  <ScoreBadge score={listing.score || 0} size="medium" />
                </div>
                <div className="listing-card-meta">
                  <span className="price">${listing.price?.toLocaleString()}/mo</span>
                  <span>{listing.bedrooms}BR / {listing.bathrooms}BA</span>
                  {listing.sqft && <span>{listing.sqft.toLocaleString()} sqft</span>}
                  <StatusPill status={listing.status} />
                </div>
                {listing.notes && <p className="listing-notes">{listing.notes}</p>}
              </div>
            </div>

            {/* Expanded Details */}
            {expandedId === listing.id && (
              <div className="listing-expanded">
                <div className="expanded-details">
                  <div className="detail-row">
                    <span className="detail-label">Pet Policy</span>
                    <span>{listing.pet_policy || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Parking</span>
                    <span>{listing.parking || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Laundry</span>
                    <span>{listing.laundry || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Available</span>
                    <span>{listing.available_date || "Not specified"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">Contact</span>
                    <span>{listing.landlord_name ? `${listing.landlord_name} (${listing.landlord_contact || "no contact"})` : "Not specified"}</span>
                  </div>
                </div>

                {listing.description && (
                  <div className="expanded-description">
                    <h4>Description</h4>
                    <p>{listing.description}</p>
                  </div>
                )}

                {/* Score Breakdown */}
                {listing.score_breakdown && Object.keys(listing.score_breakdown).length > 0 && (
                  <div className="score-breakdown-section">
                    <h4>Score Breakdown</h4>
                    <div className="breakdown-list">
                      {Object.entries(listing.score_breakdown).map(([key, val]: [string, any]) => (
                        <div key={key} className="breakdown-row">
                          <span className="breakdown-label">{key}</span>
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
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Neighborhood Report */}
                {loadingReport && expandedId === listing.id && (
                  <div className="loading-inline"><div className="loading-spinner" /> Loading neighborhood report...</div>
                )}
                {neighborhoodReport && !loadingReport && expandedId === listing.id && (
                  <div className="neighborhood-section">
                    <h4>Neighborhood Report</h4>
                    <div className="neighborhood-grid">
                      <div className="neighborhood-stat">
                        <span className="stat-label">Commute</span>
                        <span className="stat-value">{neighborhoodReport.commute_time}</span>
                      </div>
                      <div className="neighborhood-stat">
                        <span className="stat-label">Walk Score</span>
                        <span className="stat-value">{neighborhoodReport.walk_score}/100</span>
                      </div>
                      <div className="neighborhood-stat">
                        <span className="stat-label">Transit Score</span>
                        <span className="stat-value">{neighborhoodReport.transit_score}/100</span>
                      </div>
                      <div className="neighborhood-stat">
                        <span className="stat-label">Noise Level</span>
                        <span className="stat-value">{neighborhoodReport.noise_level}</span>
                      </div>
                    </div>
                    {neighborhoodReport.crime_summary && (
                      <div className="neighborhood-detail">
                        <strong>Safety:</strong> {neighborhoodReport.crime_summary}
                      </div>
                    )}
                    {neighborhoodReport.parks_nearby && (
                      <div className="neighborhood-detail">
                        <strong>Parks:</strong> {neighborhoodReport.parks_nearby}
                      </div>
                    )}
                    {neighborhoodReport.grocery_nearby && (
                      <div className="neighborhood-detail">
                        <strong>Groceries:</strong> {neighborhoodReport.grocery_nearby}
                      </div>
                    )}
                    {neighborhoodReport.ai_summary && (
                      <div className="neighborhood-summary">
                        {neighborhoodReport.ai_summary.split("\n").map((p: string, i: number) => (
                          <p key={i}>{p}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Actions */}
                <div className="listing-actions">
                  <select
                    value={listing.status}
                    onChange={e => handleStatusChange(listing.id, e.target.value)}
                    className="select-field"
                  >
                    <option value="saved">Saved</option>
                    <option value="applied">Applied</option>
                    <option value="toured">Toured</option>
                    <option value="rejected">Rejected</option>
                    <option value="leased">Leased</option>
                  </select>
                  {listing.url && (
                    <a href={listing.url} target="_blank" rel="noopener noreferrer" className="btn btn-outline btn-sm">
                      <Icons.Link /> Open Original
                    </a>
                  )}
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(listing.id)}>
                    <Icons.Trash /> Remove
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="empty-state">
            <Icons.Listings />
            <h3>No listings match your filters</h3>
            <p className="text-secondary">Try adjusting your filters or add a new listing.</p>
            <button className="btn btn-primary" onClick={() => onNavigate("add")}>
              Add Listing
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
