import React, { useState, useEffect } from "react";
import Landing from "./Landing";
import Login from "./Login";
import Dashboard from "./Dashboard";
import Listings from "./Listings";
import AddListing from "./AddListing";
import Compare from "./Compare";
import Applications from "./Applications";
import Advisor from "./Advisor";
import Settings from "./Settings";
import Tasks from "./Tasks";
import { Icons } from "./Icons";

type Page =
  | "landing"
  | "dashboard"
  | "listings"
  | "add"
  | "compare"
  | "applications"
  | "advisor"
  | "settings"
  | "tasks";

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
  if (path === "/app/tasks") return "tasks";
  return "landing";
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/auth/me");
      if (res.ok) {
        const user = await res.json();
        setAuthUser(user);
      }
    } catch (e) {
      // Not logged in
    }
    setAuthChecked(true);
    setAuthLoading(false);
  };

  const handleLogin = (user: AuthUser) => {
    setAuthUser(user);
  };

  const handleLogout = async () => {
    try {
      await fetch("/auth/logout", { method: "POST" });
    } catch (e) {
      // ignore
    }
    setAuthUser(null);
    setPage("landing");
    window.history.pushState({}, "", "/");
  };

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

  // Landing page is always public
  if (page === "landing") {
    return <Landing onNavigate={navigate} />;
  }

  // For app pages, check auth
  if (authLoading) {
    return (
      <div className="auth-loading">
        <div className="loading-spinner" />
      </div>
    );
  }

  // Not authenticated -- show login
  if (!authUser) {
    return (
      <Login
        onLogin={handleLogin}
        onNavigateHome={() => navigate("landing")}
      />
    );
  }

  const navItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: <Icons.Dashboard /> },
    { id: "add" as Page, label: "Add Listing", icon: <Icons.Add /> },
    { id: "listings" as Page, label: "My Listings", icon: <Icons.Listings /> },
    { id: "compare" as Page, label: "Compare", icon: <Icons.Compare /> },
    { id: "applications" as Page, label: "Applications", icon: <Icons.Applications /> },
    { id: "tasks" as Page, label: "Tasks", icon: <Icons.Applications /> },
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
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="sidebar-user-avatar">
              {authUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="sidebar-user-info">
              <span className="sidebar-user-name">{authUser.name}</span>
              <span className="sidebar-user-email">{authUser.email}</span>
            </div>
          </div>
          <button className="btn btn-ghost sidebar-logout" onClick={handleLogout}>
            Sign Out
          </button>
        </div>
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
          {page === "tasks" && <Tasks />}
          {page === "advisor" && <Advisor />}
          {page === "settings" && <Settings />}
        </div>
      </main>
    </div>
  );
}
