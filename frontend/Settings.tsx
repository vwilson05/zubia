import React, { useEffect, useState } from "react";
import { Icons } from "./Icons";

const DEFAULT_PRIORITIES = [
  { criterion: "commute", weight: 0.35 },
  { criterion: "price", weight: 0.25 },
  { criterion: "safety", weight: 0.2 },
  { criterion: "walkability", weight: 0.1 },
  { criterion: "pet_friendly", weight: 0.1 },
];

export default function Settings() {
  const [prefs, setPrefs] = useState<any>({
    name: "",
    email: "",
    commute_address: "",
    budget_min: "",
    budget_max: "",
    bedrooms: "",
    bathrooms: "",
    pet_friendly: false,
    parking: "",
    laundry: "",
    priorities: DEFAULT_PRIORITIES,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescored, setRescored] = useState(false);

  useEffect(() => {
    fetch("/api/preferences")
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setPrefs({
            ...data,
            pet_friendly: !!data.pet_friendly,
            priorities: data.priorities || DEFAULT_PRIORITIES,
          });
        }
      });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleRecalculate = async () => {
    setRescoring(true);
    setRescored(false);
    // First save preferences
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(prefs),
    });
    // Then re-score all listings
    const listingsRes = await fetch("/api/listings");
    const listings = await listingsRes.json();
    for (const listing of listings) {
      await fetch(`/api/listings/${listing.id}/score`, { method: "POST" });
    }
    setRescoring(false);
    setRescored(true);
    setTimeout(() => setRescored(false), 3000);
  };

  const updatePriority = (index: number, weight: number) => {
    const newPriorities = [...prefs.priorities];
    newPriorities[index] = { ...newPriorities[index], weight };
    setPrefs({ ...prefs, priorities: newPriorities });
  };

  const totalWeight = prefs.priorities.reduce((s: number, p: any) => s + p.weight, 0);

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
          <h1>Settings</h1>
          <p className="text-secondary">Configure your search preferences and scoring weights</p>
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : saved ? "Saved!" : "Save Preferences"}
        </button>
      </div>

      <div className="settings-grid">
        {/* Basic Info */}
        <div className="settings-card">
          <h3>Profile</h3>
          <div className="form-group">
            <label>Name</label>
            <input
              type="text"
              value={prefs.name}
              onChange={e => setPrefs({ ...prefs, name: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={prefs.email || ""}
              onChange={e => setPrefs({ ...prefs, email: e.target.value })}
              className="input-field"
            />
          </div>
        </div>

        {/* Location & Commute */}
        <div className="settings-card">
          <h3>Commute</h3>
          <div className="form-group">
            <label>Commute Address</label>
            <input
              type="text"
              value={prefs.commute_address || ""}
              onChange={e => setPrefs({ ...prefs, commute_address: e.target.value })}
              className="input-field"
              placeholder="e.g., San Francisco Financial District"
            />
          </div>
        </div>

        {/* Budget */}
        <div className="settings-card">
          <h3>Budget</h3>
          <div className="form-row-inline">
            <div className="form-group">
              <label>Min ($/mo)</label>
              <input
                type="number"
                value={prefs.budget_min || ""}
                onChange={e => setPrefs({ ...prefs, budget_min: parseInt(e.target.value) || null })}
                className="input-field"
                placeholder="3000"
              />
            </div>
            <div className="form-group">
              <label>Max ($/mo)</label>
              <input
                type="number"
                value={prefs.budget_max || ""}
                onChange={e => setPrefs({ ...prefs, budget_max: parseInt(e.target.value) || null })}
                className="input-field"
                placeholder="4500"
              />
            </div>
          </div>
        </div>

        {/* Requirements */}
        <div className="settings-card">
          <h3>Requirements</h3>
          <div className="form-row-inline">
            <div className="form-group">
              <label>Bedrooms</label>
              <input
                type="number"
                value={prefs.bedrooms || ""}
                onChange={e => setPrefs({ ...prefs, bedrooms: parseInt(e.target.value) || null })}
                className="input-field"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Bathrooms</label>
              <input
                type="number"
                value={prefs.bathrooms || ""}
                onChange={e => setPrefs({ ...prefs, bathrooms: parseInt(e.target.value) || null })}
                className="input-field"
                min="0"
              />
            </div>
          </div>
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={prefs.pet_friendly}
                onChange={e => setPrefs({ ...prefs, pet_friendly: e.target.checked })}
              />
              Pet Friendly
            </label>
          </div>
          <div className="form-row-inline">
            <div className="form-group">
              <label>Parking</label>
              <select
                value={prefs.parking || ""}
                onChange={e => setPrefs({ ...prefs, parking: e.target.value })}
                className="select-field"
              >
                <option value="">Any</option>
                <option value="required">Required</option>
                <option value="preferred">Preferred</option>
                <option value="none">Not needed</option>
              </select>
            </div>
            <div className="form-group">
              <label>Laundry</label>
              <select
                value={prefs.laundry || ""}
                onChange={e => setPrefs({ ...prefs, laundry: e.target.value })}
                className="select-field"
              >
                <option value="">Any</option>
                <option value="in_unit">In-unit</option>
                <option value="on_site">On-site</option>
                <option value="none">Not needed</option>
              </select>
            </div>
          </div>
        </div>

        {/* Priority Weights */}
        <div className="settings-card settings-card-full">
          <h3>Priority Weights</h3>
          <p className="text-secondary">Adjust how much each criterion matters in your scores. Total: {Math.round(totalWeight * 100)}%</p>
          <div className="priority-sliders">
            {prefs.priorities.map((p: any, i: number) => (
              <div key={p.criterion} className="priority-slider">
                <div className="priority-label">
                  <span>{p.criterion.replace("_", " ")}</span>
                  <span className="priority-value">{Math.round(p.weight * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={Math.round(p.weight * 100)}
                  onChange={e => updatePriority(i, parseInt(e.target.value) / 100)}
                  className="slider"
                />
              </div>
            ))}
          </div>
          {Math.abs(totalWeight - 1) > 0.01 && (
            <p className="warning-text">
              <Icons.Warning /> Weights should add up to 100% (currently {Math.round(totalWeight * 100)}%)
            </p>
          )}
        </div>

        {/* Recalculate */}
        <div className="settings-card settings-card-full">
          <h3>Recalculate Scores</h3>
          <p className="text-secondary">After changing your priorities, recalculate all listing scores with AI.</p>
          <button
            className="btn btn-primary"
            onClick={handleRecalculate}
            disabled={rescoring}
          >
            {rescoring ? "Recalculating..." : rescored ? "Done! Scores updated." : "Recalculate All Scores"}
          </button>
        </div>
      </div>
    </div>
  );
}
