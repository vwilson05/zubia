import React, { useEffect, useState } from "react";
import { Icons } from "./Icons";

const DEFAULT_PRIORITIES = [
  { criterion: "commute", weight: 0.35 },
  { criterion: "price", weight: 0.25 },
  { criterion: "safety", weight: 0.2 },
  { criterion: "walkability", weight: 0.1 },
  { criterion: "pet_friendly", weight: 0.1 },
];

interface CriteriaItem {
  id: string;
  label: string;
  type: "preset" | "custom";
}

const PRESET_MUST_HAVES: CriteriaItem[] = [
  { id: "washer_dryer", label: "In-unit washer/dryer", type: "preset" },
  { id: "backyard", label: "Backyard / outdoor space", type: "preset" },
  { id: "parking", label: "Parking included", type: "preset" },
  { id: "pet_friendly", label: "Pet-friendly", type: "preset" },
  { id: "garage", label: "Garage", type: "preset" },
  { id: "ac", label: "Air conditioning", type: "preset" },
  { id: "dishwasher", label: "Dishwasher", type: "preset" },
  { id: "ev_charging", label: "EV charging", type: "preset" },
];

const PRESET_NICE_TO_HAVES: CriteriaItem[] = [
  { id: "pool", label: "Pool", type: "preset" },
  { id: "extra_bathroom", label: "Extra bathroom (3+)", type: "preset" },
  { id: "modern_kitchen", label: "Updated/modern kitchen", type: "preset" },
  { id: "hardwood_floors", label: "Hardwood floors", type: "preset" },
  { id: "walk_in_closet", label: "Walk-in closet", type: "preset" },
  { id: "home_office", label: "Home office / den", type: "preset" },
  { id: "fireplace", label: "Fireplace", type: "preset" },
  { id: "smart_home", label: "Smart home features", type: "preset" },
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
    must_haves: [] as CriteriaItem[],
    nice_to_haves: [] as CriteriaItem[],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [rescoring, setRescoring] = useState(false);
  const [rescored, setRescored] = useState(false);
  const [customMustHave, setCustomMustHave] = useState("");
  const [customNiceToHave, setCustomNiceToHave] = useState("");

  useEffect(() => {
    fetch("/api/preferences")
      .then(r => r.json())
      .then(data => {
        if (data && data.id) {
          setPrefs({
            ...data,
            pet_friendly: !!data.pet_friendly,
            priorities: data.priorities || DEFAULT_PRIORITIES,
            must_haves: data.must_haves || [],
            nice_to_haves: data.nice_to_haves || [],
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

  const toggleCriteriaItem = (field: "must_haves" | "nice_to_haves", item: CriteriaItem) => {
    const current: CriteriaItem[] = prefs[field] || [];
    const exists = current.some((c: CriteriaItem) => c.id === item.id);
    const updated = exists
      ? current.filter((c: CriteriaItem) => c.id !== item.id)
      : [...current, item];
    setPrefs({ ...prefs, [field]: updated });
  };

  const addCustomItem = (field: "must_haves" | "nice_to_haves", text: string) => {
    if (!text.trim()) return;
    const id = text.trim().toLowerCase().replace(/\s+/g, "_");
    const current: CriteriaItem[] = prefs[field] || [];
    if (current.some((c: CriteriaItem) => c.id === id)) return;
    const item: CriteriaItem = { id, label: text.trim(), type: "custom" };
    setPrefs({ ...prefs, [field]: [...current, item] });
  };

  const removeItem = (field: "must_haves" | "nice_to_haves", id: string) => {
    const current: CriteriaItem[] = prefs[field] || [];
    setPrefs({ ...prefs, [field]: current.filter((c: CriteriaItem) => c.id !== id) });
  };

  const isItemSelected = (field: "must_haves" | "nice_to_haves", id: string): boolean => {
    const current: CriteriaItem[] = prefs[field] || [];
    return current.some((c: CriteriaItem) => c.id === id);
  };

  const getCustomItems = (field: "must_haves" | "nice_to_haves"): CriteriaItem[] => {
    const current: CriteriaItem[] = prefs[field] || [];
    return current.filter((c: CriteriaItem) => c.type === "custom");
  };

  return (
    <div className="page settings-page">
      <div className="page-header">
        <div>
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

        {/* Must-Haves */}
        <div className="settings-card settings-card-full">
          <h3>Must-Haves (Deal-Breakers)</h3>
          <p className="text-secondary">Listings missing these will be flagged and score-capped</p>
          <div className="criteria-checkboxes">
            {PRESET_MUST_HAVES.map(item => (
              <label key={item.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isItemSelected("must_haves", item.id)}
                  onChange={() => toggleCriteriaItem("must_haves", item)}
                />
                {item.label}
              </label>
            ))}
          </div>
          {getCustomItems("must_haves").length > 0 && (
            <div className="criteria-pills">
              {getCustomItems("must_haves").map(item => (
                <span key={item.id} className="criteria-pill">
                  {item.label}
                  <button
                    className="pill-remove"
                    onClick={() => removeItem("must_haves", item.id)}
                    aria-label={`Remove ${item.label}`}
                  >x</button>
                </span>
              ))}
            </div>
          )}
          <div className="criteria-add-row">
            <input
              type="text"
              value={customMustHave}
              onChange={e => setCustomMustHave(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  addCustomItem("must_haves", customMustHave);
                  setCustomMustHave("");
                }
              }}
              className="input-field"
              placeholder="Add custom must-have"
            />
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                addCustomItem("must_haves", customMustHave);
                setCustomMustHave("");
              }}
            >Add</button>
          </div>
        </div>

        {/* Nice-to-Haves */}
        <div className="settings-card settings-card-full">
          <h3>Nice-to-Haves (Bonus Points)</h3>
          <p className="text-secondary">Listings with these get a score boost</p>
          <div className="criteria-checkboxes">
            {PRESET_NICE_TO_HAVES.map(item => (
              <label key={item.id} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={isItemSelected("nice_to_haves", item.id)}
                  onChange={() => toggleCriteriaItem("nice_to_haves", item)}
                />
                {item.label}
              </label>
            ))}
          </div>
          {getCustomItems("nice_to_haves").length > 0 && (
            <div className="criteria-pills">
              {getCustomItems("nice_to_haves").map(item => (
                <span key={item.id} className="criteria-pill">
                  {item.label}
                  <button
                    className="pill-remove"
                    onClick={() => removeItem("nice_to_haves", item.id)}
                    aria-label={`Remove ${item.label}`}
                  >x</button>
                </span>
              ))}
            </div>
          )}
          <div className="criteria-add-row">
            <input
              type="text"
              value={customNiceToHave}
              onChange={e => setCustomNiceToHave(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  addCustomItem("nice_to_haves", customNiceToHave);
                  setCustomNiceToHave("");
                }
              }}
              className="input-field"
              placeholder="Add custom nice-to-have"
            />
            <button
              className="btn btn-outline btn-sm"
              onClick={() => {
                addCustomItem("nice_to_haves", customNiceToHave);
                setCustomNiceToHave("");
              }}
            >Add</button>
          </div>
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
