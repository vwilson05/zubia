import React, { useEffect, useState } from "react";
import { Icons, StatusPill } from "./Icons";

const STATUSES = ["inquiry", "applied", "docs_sent", "approved", "denied", "withdrawn"];
const STATUS_LABELS: Record<string, string> = {
  inquiry: "Inquiry",
  applied: "Applied",
  docs_sent: "Docs Sent",
  approved: "Approved",
  denied: "Denied",
  withdrawn: "Withdrawn",
};

export default function Applications() {
  const [applications, setApplications] = useState<any[]>([]);
  const [listings, setListings] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newApp, setNewApp] = useState({ listing_id: "", notes: "", follow_up_date: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editNotes, setEditNotes] = useState("");

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = () => {
    fetch("/api/applications").then(r => r.json()).then(setApplications);
    fetch("/api/listings").then(r => r.json()).then(setListings);
  };

  const handleAddApp = async () => {
    if (!newApp.listing_id) return;
    await fetch("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: parseInt(newApp.listing_id),
        notes: newApp.notes,
        follow_up_date: newApp.follow_up_date || null,
      }),
    });
    setShowAdd(false);
    setNewApp({ listing_id: "", notes: "", follow_up_date: "" });
    fetchAll();
  };

  const handleStatusChange = async (id: number, status: string) => {
    await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchAll();
  };

  const handleSaveNotes = async (id: number) => {
    await fetch(`/api/applications/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ notes: editNotes }),
    });
    setEditingId(null);
    fetchAll();
  };

  // Group by status for kanban view
  const columns = ["inquiry", "applied", "docs_sent", "approved", "denied"];
  const grouped: Record<string, any[]> = {};
  columns.forEach(s => { grouped[s] = []; });
  applications.forEach(app => {
    if (grouped[app.status]) grouped[app.status].push(app);
  });

  return (
    <div className="page applications-page">
      <div className="page-header">
        <div>
          <p className="text-secondary">{applications.length} total applications</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          <Icons.Add /> Track Application
        </button>
      </div>

      {/* Add Application Form */}
      {showAdd && (
        <div className="add-app-form card">
          <h3>Track New Application</h3>
          <div className="form-row">
            <select
              value={newApp.listing_id}
              onChange={e => setNewApp({ ...newApp, listing_id: e.target.value })}
              className="select-field"
            >
              <option value="">Select a listing...</option>
              {listings.map(l => (
                <option key={l.id} value={l.id}>{l.address}, {l.city} - ${l.price?.toLocaleString()}/mo</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <input
              type="date"
              value={newApp.follow_up_date}
              onChange={e => setNewApp({ ...newApp, follow_up_date: e.target.value })}
              className="input-field"
              placeholder="Follow-up date"
            />
          </div>
          <div className="form-row">
            <textarea
              value={newApp.notes}
              onChange={e => setNewApp({ ...newApp, notes: e.target.value })}
              className="input-field textarea"
              placeholder="Notes..."
              rows={3}
            />
          </div>
          <div className="form-actions">
            <button className="btn btn-primary" onClick={handleAddApp}>Save</button>
            <button className="btn btn-ghost" onClick={() => setShowAdd(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="kanban-board">
        {columns.map(status => (
          <div key={status} className="kanban-column">
            <div className="kanban-header">
              <h3>{STATUS_LABELS[status]}</h3>
              <span className="kanban-count">{grouped[status].length}</span>
            </div>
            <div className="kanban-cards">
              {grouped[status].map(app => (
                <div key={app.id} className="kanban-card">
                  <div className="kanban-card-header">
                    <h4>{app.address}</h4>
                    <span className="text-secondary text-sm">{app.city}</span>
                  </div>
                  {app.price && <span className="price text-sm">${app.price?.toLocaleString()}/mo</span>}
                  <div className="kanban-card-date">
                    <span className="text-secondary text-sm">Applied: {app.date_applied}</span>
                  </div>
                  {app.follow_up_date && (
                    <div className={`follow-up-indicator ${new Date(app.follow_up_date) <= new Date() ? "overdue" : ""}`}>
                      Follow up: {app.follow_up_date}
                    </div>
                  )}

                  {editingId === app.id ? (
                    <div className="kanban-edit">
                      <textarea
                        value={editNotes}
                        onChange={e => setEditNotes(e.target.value)}
                        className="input-field textarea-sm"
                        rows={2}
                      />
                      <button className="btn btn-primary btn-xs" onClick={() => handleSaveNotes(app.id)}>Save</button>
                      <button className="btn btn-ghost btn-xs" onClick={() => setEditingId(null)}>Cancel</button>
                    </div>
                  ) : (
                    app.notes && <p className="kanban-notes" onClick={() => { setEditingId(app.id); setEditNotes(app.notes || ""); }}>{app.notes}</p>
                  )}

                  <div className="kanban-card-actions">
                    <select
                      value={app.status}
                      onChange={e => handleStatusChange(app.id, e.target.value)}
                      className="select-field select-sm"
                    >
                      {STATUSES.map(s => (
                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                      ))}
                    </select>
                    <button
                      className="icon-btn icon-btn-sm"
                      onClick={() => { setEditingId(app.id); setEditNotes(app.notes || ""); }}
                    >
                      <Icons.Edit />
                    </button>
                  </div>
                </div>
              ))}
              {grouped[status].length === 0 && (
                <div className="kanban-empty">
                  <p className="text-secondary text-sm">No applications</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
