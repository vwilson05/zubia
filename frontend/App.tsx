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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const navigate = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
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

  const navItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: <Icons.Dashboard /> },
    { id: "add" as Page, label: "Add Listing", icon: <Icons.Add /> },
    { id: "listings" as Page, label: "My Listings", icon: <Icons.Listings /> },
    { id: "compare" as Page, label: "Compare", icon: <Icons.Compare /> },
    { id: "applications" as Page, label: "Applications", icon: <Icons.Applications /> },
    { id: "advisor" as Page, label: "AI Advisor", icon: <Icons.Advisor /> },
    { id: "settings" as Page, label: "Settings", icon: <Icons.Settings /> },
  ];

  return (
    <div className="app-layout">
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate("landing")}>
            <Icons.Logo />
            <span>zubia</span>
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>&times;</button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => navigate(item.id)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>
      <main className="main-content">
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <h2 className="topbar-title">{navItems.find(n => n.id === page)?.label || "Dashboard"}</h2>
        </header>
        <div className="page-content">
          {page === "dashboard" && <Dashboard onNavigate={navigate} />}
          {page === "listings" && <Listings onNavigate={navigate} />}
          {page === "add" && <AddListing onNavigate={navigate} />}
          {page === "compare" && <Compare />}
          {page === "applications" && <Applications />}
          {page === "advisor" && <Advisor />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}
