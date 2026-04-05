import React, { useState, useEffect } from "react";
import { Icons } from "./Icons";

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

interface WelcomeProps {
  userName: string;
  onComplete: () => void;
}

export default function Welcome({ userName, onComplete }: WelcomeProps) {
  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const totalSteps = 5;

  // Criteria state (pre-filled from existing prefs)
  const [commuteAddress, setCommuteAddress] = useState("");
  const [budgetMin, setBudgetMin] = useState<number | "">("");
  const [budgetMax, setBudgetMax] = useState<number | "">("");
  const [bedrooms, setBedrooms] = useState<number | "">("");
  const [bathrooms, setBathrooms] = useState<number | "">("");
  const [mustHaves, setMustHaves] = useState<CriteriaItem[]>([]);

  // Load existing preferences
  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        if (data && data.id) {
          if (data.commute_address) setCommuteAddress(data.commute_address);
          if (data.budget_min) setBudgetMin(data.budget_min);
          if (data.budget_max) setBudgetMax(data.budget_max);
          if (data.bedrooms) setBedrooms(data.bedrooms);
          if (data.bathrooms) setBathrooms(data.bathrooms);
          if (data.must_haves && data.must_haves.length > 0) {
            setMustHaves(data.must_haves);
          }
        }
      })
      .catch(() => {});
  }, []);

  const goToStep = (next: number) => {
    setAnimating(true);
    setTimeout(() => {
      setStep(next);
      setAnimating(false);
    }, 250);
  };

  const saveCriteria = async () => {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        commute_address: commuteAddress,
        budget_min: budgetMin || null,
        budget_max: budgetMax || null,
        bedrooms: bedrooms || null,
        bathrooms: bathrooms || null,
      }),
    });
  };

  const saveMustHaves = async () => {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        must_haves: mustHaves,
      }),
    });
  };

  const finishOnboarding = async () => {
    await fetch("/api/user/onboard", { method: "PUT" });
    onComplete();
  };

  const toggleMustHave = (item: CriteriaItem) => {
    const exists = mustHaves.some((c) => c.id === item.id);
    if (exists) {
      setMustHaves(mustHaves.filter((c) => c.id !== item.id));
    } else {
      setMustHaves([...mustHaves, item]);
    }
  };

  const isMustHaveSelected = (id: string): boolean => {
    return mustHaves.some((c) => c.id === id);
  };

  const firstName = userName.split(" ")[0];

  return (
    <div className="welcome-page">
      {/* Progress dots */}
      <div className="welcome-progress">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div
            key={i}
            className={`welcome-dot ${i + 1 === step ? "welcome-dot-active" : ""} ${i + 1 < step ? "welcome-dot-done" : ""}`}
          />
        ))}
        <span className="welcome-step-label">Step {step} of {totalSteps}</span>
      </div>

      <div className={`welcome-step-container ${animating ? "welcome-fade-out" : "welcome-fade-in"}`}>

        {/* Step 1: Welcome */}
        {step === 1 && (
          <div className="welcome-step welcome-step-center">
            <div className="welcome-logo">
              <Icons.Logo />
              <span>zubia</span>
            </div>
            <h1 className="welcome-title">Welcome to Zubia, {firstName}!</h1>
            <p className="welcome-subtitle">
              Your personal rental search command center. Here is how it works:
            </p>
            <div className="welcome-explain">
              <p>
                Zubia helps you find, score, compare, and track rental properties
                across Zillow and Redfin -- all in one place, scored against YOUR priorities.
              </p>
              <p>
                We will walk you through a quick setup so everything is personalized for you.
                It only takes a minute.
              </p>
            </div>
            <div className="welcome-video">
              <iframe
                src="https://www.youtube.com/embed/uktQI9dqU3M"
                title="Welcome to Zubia"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
            <button className="btn btn-primary btn-lg welcome-cta" onClick={() => goToStep(2)}>
              Let's get you set up
            </button>
          </div>
        )}

        {/* Step 2: Criteria */}
        {step === 2 && (
          <div className="welcome-step">
            <h1 className="welcome-title">Your Search Criteria</h1>
            <p className="welcome-subtitle">
              Tell us what you are looking for so we can score every listing against your needs.
            </p>

            <div className="welcome-form">
              <div className="welcome-form-group">
                <label>Where are you commuting to?</label>
                <input
                  type="text"
                  className="input-field input-lg"
                  placeholder="e.g., San Francisco Financial District"
                  value={commuteAddress}
                  onChange={(e) => setCommuteAddress(e.target.value)}
                />
              </div>

              <div className="welcome-form-row">
                <div className="welcome-form-group">
                  <label>Minimum budget ($/mo)</label>
                  <input
                    type="number"
                    className="input-field input-lg"
                    placeholder="3000"
                    value={budgetMin}
                    onChange={(e) => setBudgetMin(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
                <div className="welcome-form-group">
                  <label>Maximum budget ($/mo)</label>
                  <input
                    type="number"
                    className="input-field input-lg"
                    placeholder="4500"
                    value={budgetMax}
                    onChange={(e) => setBudgetMax(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
              </div>

              <div className="welcome-form-row">
                <div className="welcome-form-group">
                  <label>Bedrooms</label>
                  <input
                    type="number"
                    className="input-field input-lg"
                    placeholder="3"
                    min="0"
                    value={bedrooms}
                    onChange={(e) => setBedrooms(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
                <div className="welcome-form-group">
                  <label>Bathrooms</label>
                  <input
                    type="number"
                    className="input-field input-lg"
                    placeholder="2"
                    min="0"
                    value={bathrooms}
                    onChange={(e) => setBathrooms(e.target.value ? parseInt(e.target.value) : "")}
                  />
                </div>
              </div>
            </div>

            <div className="welcome-nav">
              <button className="btn btn-ghost" onClick={() => goToStep(1)}>Back</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={async () => {
                  await saveCriteria();
                  goToStep(3);
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Must-Haves */}
        {step === 3 && (
          <div className="welcome-step">
            <h1 className="welcome-title">Your Must-Haves</h1>
            <p className="welcome-subtitle">
              What are your deal-breakers? Listings missing these will get flagged so you do not waste time on them.
            </p>

            <div className="welcome-must-haves">
              {PRESET_MUST_HAVES.map((item) => (
                <label
                  key={item.id}
                  className={`welcome-checkbox-card ${isMustHaveSelected(item.id) ? "welcome-checkbox-card-active" : ""}`}
                >
                  <input
                    type="checkbox"
                    checked={isMustHaveSelected(item.id)}
                    onChange={() => toggleMustHave(item)}
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>

            <div className="welcome-nav">
              <button className="btn btn-ghost" onClick={() => goToStep(2)}>Back</button>
              <button
                className="btn btn-primary btn-lg"
                onClick={async () => {
                  await saveMustHaves();
                  goToStep(4);
                }}
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 4: How to Use */}
        {step === 4 && (
          <div className="welcome-step">
            <h1 className="welcome-title">How to Use Zubia</h1>
            <p className="welcome-subtitle">
              Here is what each part of your command center does.
            </p>

            <div className="welcome-features">
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon"><Icons.Add /></div>
                <div>
                  <h3>Search</h3>
                  <p>Type a location or paste a Zillow/Redfin URL to find rentals.</p>
                </div>
              </div>
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon"><Icons.Dashboard /></div>
                <div>
                  <h3>Score</h3>
                  <p>Every listing gets a personal score based on YOUR criteria.</p>
                </div>
              </div>
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon"><Icons.Compare /></div>
                <div>
                  <h3>Compare</h3>
                  <p>Put your top picks side-by-side with AI analysis.</p>
                </div>
              </div>
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon"><Icons.Applications /></div>
                <div>
                  <h3>Track</h3>
                  <p>Use the Application tracker to manage where you have applied.</p>
                </div>
              </div>
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon"><Icons.Applications /></div>
                <div>
                  <h3>Tasks</h3>
                  <p>Keep track of follow-ups, tours, and deadlines.</p>
                </div>
              </div>
              <div className="welcome-feature-card">
                <div className="welcome-feature-icon"><Icons.Advisor /></div>
                <div>
                  <h3>Ask</h3>
                  <p>The AI Advisor answers any question about your search.</p>
                </div>
              </div>
            </div>

            <div className="welcome-nav">
              <button className="btn btn-ghost" onClick={() => goToStep(3)}>Back</button>
              <button className="btn btn-primary btn-lg" onClick={() => goToStep(5)}>
                Next
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Ready */}
        {step === 5 && (
          <div className="welcome-step welcome-step-center">
            <div className="welcome-ready-icon">
              <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h1 className="welcome-title">You are all set!</h1>
            <p className="welcome-subtitle">
              Your preferences are saved. Let's find your next home, {firstName}.
            </p>
            <button className="btn btn-primary btn-lg welcome-cta" onClick={finishOnboarding}>
              Go to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
