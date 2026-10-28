import { NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { LogOut, FileText, BookOpen, DollarSign, Users } from "lucide-react";
import type { ReactNode } from "react";

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: "/quick-quote", label: "Quick Quote", icon: <FileText size={16} /> },
  { to: "/estimates", label: "Estimates", icon: <FileText size={16} /> },
  { to: "/catalog", label: "Catalog", icon: <BookOpen size={16} /> },
  { to: "/pricebook", label: "Pricebook", icon: <DollarSign size={16} />, roles: ["owner"] },
  { to: "/users", label: "Users", icon: <Users size={16} />, roles: ["owner"] },
];

export function AppLayout({ children, isMock }: { children: ReactNode; isMock: boolean }) {
  const { session, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  const visibleNav = navItems.filter((item) => !item.roles || item.roles.includes(session?.role ?? ""));

  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header-brand">
          <div className="flex-col">
            <h1>Triple A Estimate Builder</h1>
            <span className="subtitle">Garage Door Installation</span>
          </div>
        </div>
        <nav className="app-header-nav">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`}
            >
              {item.icon}
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="app-header-user">
          <div className="user-badge">
            <span>{session?.full_name ?? session?.email}</span>
            <span className={`role-pill ${session?.role}`}>{session?.role}</span>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={handleSignOut} style={{ color: "white" }}>
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      </header>
      {isMock && (
        <div className="alert alert-warning" style={{ margin: 0, borderRadius: 0 }}>
          Demo mode: Not connected to the live Supabase project. Data shown is sample data.
          The app is configured to connect to project dclsuavrlnaclpvkbrck when network access is available.
        </div>
      )}
      <main className="app-main fade-in">{children}</main>
    </div>
  );
}
