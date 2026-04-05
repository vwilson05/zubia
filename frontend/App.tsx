import React, { useState, useEffect } from "react";
import Landing from "./Landing";
import Login from "./Login";
import Welcome from "./Welcome";
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

function isDemoPath(): boolean {
  return window.location.pathname.startsWith("/demo");
}

function getInitialPage(): Page {
  const path = window.location.pathname;
  if (path === "/") return "landing";
  // Demo routes map to the same pages as /app
  if (path === "/demo" || path === "/app") return "dashboard";
  const prefix = isDemoPath() ? "/demo/" : "/app/";
  const sub = path.startsWith(prefix) ? path.slice(prefix.length) : "";
  if (sub === "listings") return "listings";
  if (sub === "add") return "add";
  if (sub === "compare") return "compare";
  if (sub === "applications") return "applications";
  if (sub === "advisor") return "advisor";
  if (sub === "settings") return "settings";
  if (sub === "tasks") return "tasks";
  return "landing";
}

interface AuthUser {
  id: number;
  name: string;
  email: string;
  onboarded?: number;
}

export default function App() {
  const [page, setPage] = useState<Page>(getInitialPage());
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(isDemoPath());
  const [demoBannerDismissed, setDemoBannerDismissed] = useState(false);
  const [demoToast, setDemoToast] = useState("");

  // Check auth on mount
  useEffect(() => {
    if (demoMode) {
      // In demo mode, create demo session cookie and use demo user
      document.cookie = "zubia_demo=1; path=/; max-age=86400; SameSite=Lax";
      fetch("/auth/me").then(res => {
        if (res.ok) return res.json();
        return null;
      }).then(user => {
        if (user) setAuthUser(user);
        else setAuthUser({ id: 1, name: "Demo User", email: "demo@zubia.app" });
        setAuthChecked(true);
        setAuthLoading(false);
      }).catch(() => {
        setAuthUser({ id: 1, name: "Demo User", email: "demo@zubia.app" });
        setAuthChecked(true);
        setAuthLoading(false);
      });
    } else {
      checkAuth();
    }
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch("/auth/me");
      if (res.ok) {
        const user = await res.json();
        // Don't accept demo user on the real /app path
        if (!user.demo) {
          setAuthUser(user);
        }
      }
    } catch (e) {
      // Not logged in
    }
    setAuthChecked(true);
    setAuthLoading(false);
  };

  const showDemoToast = (msg?: string) => {
    setDemoToast(msg || "Sign in to save changes");
    setTimeout(() => setDemoToast(""), 3000);
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
    // Clear demo cookie too
    document.cookie = "zubia_demo=; path=/; max-age=0";
    setAuthUser(null);
    setDemoMode(false);
    setPage("landing");
    window.history.pushState({}, "", "/");
  };

  const navigate = (p: Page) => {
    setPage(p);
    setSidebarOpen(false);
    const prefix = demoMode ? "/demo" : "/app";
    const path = p === "landing" ? "/" : `${prefix}${p === "dashboard" ? "" : `/${p}`}`;
    window.history.pushState({}, "", path);
  };

  useEffect(() => {
    const handlePop = () => {
      setDemoMode(isDemoPath());
      setPage(getInitialPage());
    };
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

  // Not authenticated and not demo -- show login
  if (!authUser && !demoMode) {
    return (
      <Login
        onLogin={handleLogin}
        onNavigateHome={() => navigate("landing")}
      />
    );
  }

  // Show onboarding for authenticated (non-demo) users who haven't completed it
  if (authUser && !demoMode && authUser.onboarded === 0) {
    return (
      <Welcome
        userName={authUser.name}
        onComplete={() => {
          setAuthUser({ ...authUser, onboarded: 1 });
          setPage("dashboard");
        }}
      />
    );
  }

  // In demo mode, hide "Add Listing" from nav (it's a write operation)
  const navItems = [
    { id: "dashboard" as Page, label: "Dashboard", icon: <Icons.Dashboard /> },
    ...(!demoMode ? [{ id: "add" as Page, label: "Add Listing", icon: <Icons.Add /> }] : []),
    { id: "listings" as Page, label: "My Listings", icon: <Icons.Listings /> },
    { id: "compare" as Page, label: "Compare", icon: <Icons.Compare /> },
    { id: "applications" as Page, label: "Applications", icon: <Icons.Applications /> },
    { id: "tasks" as Page, label: "Tasks", icon: <Icons.Applications /> },
    { id: "advisor" as Page, label: "AI Advisor", icon: <Icons.Advisor /> },
    ...(!demoMode ? [{ id: "settings" as Page, label: "Settings", icon: <Icons.Settings /> }] : []),
  ];

  const goToSignIn = () => {
    document.cookie = "zubia_demo=; path=/; max-age=0";
    window.location.href = "/app";
  };

  return (
    <div className="app-layout">
      {demoToast && (
        <div className="demo-toast">{demoToast}</div>
      )}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} />}
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" onClick={() => navigate("landing")}>
            <Icons.Logo />
            <span>zubia</span>
            {demoMode && <span className="demo-badge">DEMO</span>}
          </div>
          <button className="sidebar-close" onClick={() => setSidebarOpen(false)}>&times;</button>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${page === item.id ? "active" : ""}`}
              onClick={() => {
                if (demoMode && (item.id === "add" || item.id === "settings")) {
                  showDemoToast();
                  return;
                }
                navigate(item.id);
              }}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="sidebar-footer">
          {demoMode ? (
            <button className="btn btn-primary sidebar-login-btn" onClick={goToSignIn}>
              Sign In
            </button>
          ) : (
            <>
              <div className="sidebar-user">
                <div className="sidebar-user-avatar">
                  {authUser!.name.charAt(0).toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <span className="sidebar-user-name">{authUser!.name}</span>
                  <span className="sidebar-user-email">{authUser!.email}</span>
                </div>
              </div>
              <button className="btn btn-ghost sidebar-logout" onClick={handleLogout}>
                Sign Out
              </button>
            </>
          )}
        </div>
      </aside>
      <main className="main-content">
        {demoMode && !demoBannerDismissed && (
          <div className="demo-banner">
            <div className="demo-banner-inner">
              <span className="demo-banner-text">
                You are viewing demo data. Sign in to start your own search.
              </span>
              <div className="demo-banner-actions">
                <button className="btn btn-primary btn-sm" onClick={goToSignIn}>
                  Sign In
                </button>
                <button className="demo-banner-dismiss" onClick={() => setDemoBannerDismissed(true)}>
                  &times;
                </button>
              </div>
            </div>
          </div>
        )}
        <header className="topbar">
          <button className="hamburger" onClick={() => setSidebarOpen(true)}>
            <span /><span /><span />
          </button>
          <h2 className="topbar-title">{navItems.find(n => n.id === page)?.label || "Dashboard"}</h2>
        </header>
        <div className="page-content">
          {page === "dashboard" && <Dashboard onNavigate={navigate} />}
          {page === "listings" && <Listings onNavigate={navigate} />}
          {page === "add" && (demoMode ? <div className="demo-blocked"><p>Sign in to add listings.</p><button className="btn btn-primary" onClick={goToSignIn}>Sign In</button></div> : <AddListing onNavigate={navigate} />)}
          {page === "compare" && <Compare />}
          {page === "applications" && <Applications />}
          {page === "tasks" && <Tasks />}
          {page === "advisor" && <Advisor />}
          {page === "settings" && (demoMode ? <div className="demo-blocked"><p>Sign in to manage settings.</p><button className="btn btn-primary" onClick={goToSignIn}>Sign In</button></div> : <Settings />)}
        </div>
      </main>
    </div>
  );
}
