import React, { useState, useEffect } from "react";
import Landing from "./Landing";
import Dashboard from "./Dashboard";
import Listings from "./Listings";
import AddListing from "./AddListing";
import Compare from "./Compare";
import Applications from "./Applications";
import Advisor from "./Advisor";
import Settings from "./Settings";
import { Icons } from "./Icons";

type Page =
  | "landing"
  | "dashboard"
  | "listings"
  | "add"
  | "compare"
  | "applications"
  | "advisor"
  | "settings";

function getInitialPage(): Page {
  const path = window.location.pathname;
  if (path === "/") return "landing";
  if (path === "/app") return "dashboard";
  if (path === "/app/listings") return "listings";
  if (path === "/app/add") return "add";
  if (path === "/app/compare") return "compare";
  if (path === "/app/applications") return "applications";
  if (path === "/app/advisor") return "advisor";
  if (path === "/app/settings") return "settings";
  return "landing";
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage());

  const navigate = (p: Page) => {
    setPage(p);
    const path = p === "landing" ? "/" : `/app${p === "dashboard" ? "" : `/${p}`}`;
    window.history.pushState({}, "", path);
  };

  useEffect(() => {
    const handlePop = () => setPage(getInitialPage());
    window.addEventListener("popstate", handlePop);
    return () => window.removeEventListener("popstate", handlePop);
  }, []);

  if (page === "landing") {
    return <Landing onNavigate={navigate} />;
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand" onClick={() => navigate("landing")}>
          <Icons.Logo />
          <span>zubia</span>
        </div>
        <nav className="sidebar-nav">
          <button
            className={`nav-item ${page === "dashboard" ? "active" : ""}`}
            onClick={() => navigate("dashboard")}
          >
            <Icons.Dashboard />
            <span>Dashboard</span>
          </button>
          <button
            className={`nav-item ${page === "add" ? "active" : ""}`}
            onClick={() => navigate("add")}
          >
            <Icons.Add />
            <span>Add Listing</span>
          </button>
          <button
            className={`nav-item ${page === "listings" ? "active" : ""}`}
            onClick={() => navigate("listings")}
          >
            <Icons.Listings />
            <span>My Listings</span>
          </button>
          <button
            className={`nav-item ${page === "compare" ? "active" : ""}`}
            onClick={() => navigate("compare")}
          >
            <Icons.Compare />
            <span>Compare</span>
          </button>
          <button
            className={`nav-item ${page === "applications" ? "active" : ""}`}
            onClick={() => navigate("applications")}
          >
            <Icons.Applications />
            <span>Applications</span>
          </button>
          <button
            className={`nav-item ${page === "advisor" ? "active" : ""}`}
            onClick={() => navigate("advisor")}
          >
            <Icons.Advisor />
            <span>AI Advisor</span>
          </button>
          <button
            className={`nav-item ${page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <Icons.Settings />
            <span>Settings</span>
          </button>
        </nav>
      </aside>
      <main className="main-content">
        {page === "dashboard" && <Dashboard onNavigate={navigate} />}
        {page === "listings" && <Listings onNavigate={navigate} />}
        {page === "add" && <AddListing onNavigate={navigate} />}
        {page === "compare" && <Compare />}
        {page === "applications" && <Applications />}
        {page === "advisor" && <Advisor />}
        {page === "settings" && <Settings />}
      </main>
    </div>
  );
}
