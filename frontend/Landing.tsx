import React, { useState } from "react";
import { Icons } from "./Icons";

interface LandingProps {
  onNavigate: (page: any) => void;
}

export default function Landing({ onNavigate }: LandingProps) {
  const [email, setEmail] = useState("");
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const [demoUrl, setDemoUrl] = useState("https://www.zillow.com/homedetails/742-Castro-St-Mountain-View-CA-94041/");
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoResult, setDemoResult] = useState<any>(null);

  const handleEmailSignup = async () => {
    if (!email) return;
    await fetch("/api/email-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, source: "landing_hero" }),
    });
    setEmailSubmitted(true);
  };

  const handleDemoAnalyze = async () => {
    setDemoLoading(true);
    setDemoResult(null);
    try {
      const res = await fetch("/api/listings/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: demoUrl }),
      });
      const data = await res.json();
      setDemoResult(data);
    } catch (e) {
      setDemoResult({ error: "Failed to analyze listing. Try again." });
    }
    setDemoLoading(false);
  };

  return (
    <div className="landing">
      {/* Nav */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-brand">
            <Icons.Logo />
            <span>zubia</span>
          </div>
          <button className="btn btn-primary" onClick={() => onNavigate("dashboard")}>
            Open App
          </button>
        </div>
      </header>

      {/* Hero */}
      <section className="hero">
        <div className="hero-inner">
          <p className="hero-tagline">zubia — Basque for "bridge"</p>
          <h1 className="hero-title">Stop scrolling.<br/>Start deciding.</h1>
          <p className="hero-subtitle">
            Paste a listing URL from anywhere. AI scores it against YOUR priorities, enriches it with neighborhood data, and helps you decide. Finally.
          </p>
          <div className="hero-actions">
            {!emailSubmitted ? (
              <div className="hero-email-form">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEmailSignup()}
                  className="input-field"
                />
                <button className="btn btn-primary" onClick={handleEmailSignup}>
                  Get Early Access
                </button>
              </div>
            ) : (
              <p className="hero-email-success">You are in. We will reach out soon.</p>
            )}
            <button className="btn btn-outline" onClick={() => onNavigate("dashboard")}>
              Try the Demo
              <Icons.ArrowRight />
            </button>
          </div>
        </div>
      </section>

      {/* Live Demo */}
      <section className="landing-section demo-section">
        <div className="section-inner">
          <h2 className="section-title">See it in action</h2>
          <p className="section-subtitle">Paste any rental listing URL and watch the magic happen.</p>
          <div className="demo-input-row">
            <div className="demo-url-input">
              <Icons.Link />
              <input
                type="text"
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="Paste a Zillow, Redfin, or Craigslist URL..."
                className="input-field"
              />
            </div>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleDemoAnalyze}
              disabled={demoLoading}
            >
              {demoLoading ? "Analyzing..." : "Analyze Listing"}
            </button>
          </div>

          {demoLoading && (
            <div className="demo-loading">
              <div className="loading-spinner" />
              <div className="loading-steps">
                <p className="loading-step active">Extracting listing data...</p>
                <p className="loading-step">Scoring against your criteria...</p>
                <p className="loading-step">Checking for red flags...</p>
              </div>
            </div>
          )}

          {demoResult && !demoResult.error && demoResult.listing && (
            <div className="demo-result">
              <div className="demo-result-card">
                <div className="demo-result-header">
                  <div>
                    <h3>{demoResult.listing.address || "Address extracted"}</h3>
                    <p className="text-secondary">{demoResult.listing.city}</p>
                  </div>
                  <div className="demo-score-badge" style={{
                    "--score-color": (demoResult.listing.score || 0) >= 80 ? "var(--success)" : (demoResult.listing.score || 0) >= 60 ? "var(--warning)" : "var(--accent)"
                  } as any}>
                    <span className="score-value">{demoResult.listing.score || "?"}</span>
                    <span className="score-label">/ 100</span>
                  </div>
                </div>
                <div className="demo-result-details">
                  <span>${demoResult.listing.price?.toLocaleString()}/mo</span>
                  <span>{demoResult.listing.bedrooms} BR / {demoResult.listing.bathrooms} BA</span>
                  {demoResult.listing.sqft && <span>{demoResult.listing.sqft.toLocaleString()} sqft</span>}
                </div>
                {demoResult.listing.description && (
                  <p className="demo-result-desc">{demoResult.listing.description.substring(0, 200)}...</p>
                )}
                {demoResult.listing.score_breakdown && Object.keys(demoResult.listing.score_breakdown).length > 0 && (
                  <div className="demo-score-breakdown">
                    <h4>Score Breakdown</h4>
                    {Object.entries(demoResult.listing.score_breakdown).filter(([key]) => !key.startsWith("_")).map(([key, val]: [string, any]) => (
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
                )}
                {demoResult.scam_risk && demoResult.scam_risk.risk_score > 30 && (
                  <div className="scam-warning">
                    <Icons.Warning />
                    <span>Scam Risk: {demoResult.scam_risk.risk_score}/100</span>
                    <ul>
                      {demoResult.scam_risk.reasons?.map((r: string, i: number) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Pain Points */}
      <section className="landing-section pain-section">
        <div className="section-inner">
          <h2 className="section-title">Sound familiar?</h2>
          <div className="pain-grid">
            <div className="pain-card">
              <div className="pain-icon"><Icons.Listings /></div>
              <p>"5 apps, 50 tabs, zero clarity"</p>
            </div>
            <div className="pain-card">
              <div className="pain-icon"><Icons.Compare /></div>
              <p>"Same listing, different prices, which is real?"</p>
            </div>
            <div className="pain-card">
              <div className="pain-icon"><Icons.Applications /></div>
              <p>"Applied 3 days ago. Heard nothing. Is that normal?"</p>
            </div>
            <div className="pain-card">
              <div className="pain-icon"><Icons.Shield /></div>
              <p>"Is this neighborhood actually safe or just Walk Score safe?"</p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="landing-section features-section">
        <div className="section-inner">
          <h2 className="section-title">Everything you need to decide</h2>
          <p className="section-subtitle">One place for your entire rental search.</p>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon"><Icons.Link /></div>
              <h3>Paste & Score</h3>
              <p>Paste any listing URL from Zillow, Redfin, Craigslist, or anywhere. Get a personal score in seconds.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Icons.Score /></div>
              <h3>Your Criteria, Your Score</h3>
              <p>Weighted scoring that reflects what YOU care about. Commute, price, safety, walkability — you set the weights.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Icons.Map /></div>
              <h3>Neighborhood Intel</h3>
              <p>Real commute times, safety data, walkability, noise levels, and nearby amenities. Not just a number.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Icons.Compare /></div>
              <h3>Side-by-Side</h3>
              <p>Compare your top picks with AI-powered analysis. See exactly where each listing wins and loses.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Icons.Applications /></div>
              <h3>Application Tracker</h3>
              <p>Know where you stand with every application. Track docs, deadlines, and follow-ups in one place.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon"><Icons.Advisor /></div>
              <h3>AI Advisor</h3>
              <p>"Should I apply?" "Is this a good deal?" "What should I ask the landlord?" Get real answers, not generic tips.</p>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="landing-section how-section">
        <div className="section-inner">
          <h2 className="section-title">Three steps to clarity</h2>
          <div className="how-steps">
            <div className="how-step">
              <div className="how-step-number">1</div>
              <h3>Tell us what matters</h3>
              <p>Set your commute address, budget range, and priority weights. Takes 2 minutes.</p>
            </div>
            <div className="how-step-arrow">
              <Icons.ArrowRight />
            </div>
            <div className="how-step">
              <div className="how-step-number">2</div>
              <h3>Paste listings</h3>
              <p>From Zillow, Redfin, Craigslist, Apartments.com — anywhere. We extract and score everything.</p>
            </div>
            <div className="how-step-arrow">
              <Icons.ArrowRight />
            </div>
            <div className="how-step">
              <div className="how-step-number">3</div>
              <h3>Decide with confidence</h3>
              <p>Scores, comparisons, neighborhood intel, and AI advice. You will know which place is right.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Credibility */}
      <section className="landing-section credibility-section">
        <div className="section-inner">
          <div className="credibility-card">
            <p className="credibility-text">
              "Built by a family actively searching for a rental in the Bay Area. We know the pain because we are living it."
            </p>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-section pricing-section">
        <div className="section-inner">
          <h2 className="section-title">Free. Seriously.</h2>
          <p className="section-subtitle">
            No pricing tiers. No "premium" upsells. No credit card required. Renters have enough to pay for already.
          </p>
          <button className="btn btn-primary btn-lg" onClick={() => onNavigate("dashboard")}>
            Start Using Zubia
            <Icons.ArrowRight />
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="footer-inner">
          <div className="footer-brand">
            <Icons.Logo />
            <span>zubia</span>
          </div>
          <p className="footer-tagline">Stop scrolling. Start deciding.</p>
          <p className="footer-copy">Built with care in the Bay Area.</p>
        </div>
      </footer>
    </div>
  );
}
