import React, { useEffect, useState } from "react";
import { Icons, ScoreBadge, StatusPill } from "./Icons";

interface DashboardProps {
  onNavigate: (page: any) => void;
}

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [listings, setListings] = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [prefs, setPrefs] = useState<any>(null);

  useEffect(() => {
    fetch("/api/listings").then(r => r.json()).then(setListings);
    fetch("/api/applications").then(r => r.json()).then(setApplications);
    fetch("/api/preferences").then(r => r.json()).then(setPrefs);
  }, []);

  const activeListings = listings.filter(l => l.status !== "rejected" && l.status !== "leased");
  const avgScore = activeListings.length > 0
    ? Math.round(activeListings.reduce((s, l) => s + (l.score || 0), 0) / activeListings.length)
    : 0;
  const topListing = listings.length > 0 ? listings[0] : null; // Already sorted by score DESC
  const pendingApps = applications.filter(a => !["approved", "denied", "withdrawn"].includes(a.status));
  const topListings = listings.slice(0, 3);

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <div>
          <p className="text-secondary">Bay Area</p>
        </div>
        <button className="btn btn-primary" onClick={() => onNavigate("add")}>
          <Icons.Add />
          Add Listing
        </button>
      </div>

      {/* Quick Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Icons.Listings /></div>
          <div className="stat-value">{activeListings.length}</div>
          <div className="stat-label">Listings Saved</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Icons.Score /></div>
          <div className="stat-value">{avgScore}</div>
          <div className="stat-label">Avg Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Icons.Applications /></div>
          <div className="stat-value">{pendingApps.length}</div>
          <div className="stat-label">Apps Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><Icons.Star /></div>
          <div className="stat-value">{topListing?.score || "-"}</div>
          <div className="stat-label">Highest Score</div>
        </div>
      </div>

      {/* Top Listings */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Top Listings by Score</h2>
          <button className="btn btn-ghost" onClick={() => onNavigate("listings")}>
            View All <Icons.ArrowRight />
          </button>
        </div>
        <div className="listings-row">
          {topListings.map((listing) => (
            <div key={listing.id} className="listing-card-compact">
              <div className="listing-card-photo">
                <Icons.Neighborhood />
              </div>
              <div className="listing-card-info">
                <h3>{listing.address}</h3>
                <p className="text-secondary">{listing.city}</p>
                <div className="listing-card-meta">
                  <span>${listing.price?.toLocaleString()}/mo</span>
                  <span>{listing.bedrooms}BR / {listing.bathrooms}BA</span>
                </div>
                {listing.score_breakdown?._missing_must_haves?.length > 0 && (
                  <div className="must-have-warning">
                    <Icons.Warning /> Missing: {listing.score_breakdown._missing_must_haves.join(", ")}
                  </div>
                )}
                {listing.score_breakdown?._present_nice_to_haves?.length > 0 && (
                  <div className="nice-to-have-badges">
                    Bonus: {listing.score_breakdown._present_nice_to_haves.map((item: string, i: number) => (
                      <span key={i} className="nice-to-have-badge">{item}</span>
                    ))}
                  </div>
                )}
              </div>
              <ScoreBadge score={listing.score || 0} size="medium" />
            </div>
          ))}
          {topListings.length === 0 && (
            <div className="empty-state">
              <p>No listings yet. Add your first one!</p>
              <button className="btn btn-primary" onClick={() => onNavigate("add")}>
                Add Listing
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="dashboard-section">
        <div className="section-header">
          <h2>Recent Applications</h2>
          <button className="btn btn-ghost" onClick={() => onNavigate("applications")}>
            View All <Icons.ArrowRight />
          </button>
        </div>
        <div className="activity-list">
          {applications.slice(0, 5).map((app) => (
            <div key={app.id} className="activity-item">
              <div className="activity-info">
                <h4>{app.address}, {app.city}</h4>
                <p className="text-secondary">{app.notes?.substring(0, 80)}{app.notes?.length > 80 ? "..." : ""}</p>
              </div>
              <div className="activity-meta">
                <StatusPill status={app.status} />
                {app.follow_up_date && (
                  <span className="text-secondary text-sm">Follow up: {app.follow_up_date}</span>
                )}
              </div>
            </div>
          ))}
          {applications.length === 0 && (
            <div className="empty-state-sm">
              <p className="text-secondary">No applications yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
