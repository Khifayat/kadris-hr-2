import Link from "next/link";
import type { ReactNode } from "react";
import type { AppUser } from "@/lib/auth/session";
import { canManageEmployees, canReadHrWorkspace } from "@/lib/permissions/roles";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", access: "hr" },
  { href: "/my-requirements", label: "My Requirements", icon: "checklist", access: "all" },
  { href: "/employees", label: "Employees", icon: "people", access: "hr" },
  { href: "/compliance", label: "Compliance", icon: "shield", access: "hr" },
  { href: "/reminders", label: "Reminders", icon: "bell", access: "all" },
  { href: "/settings", label: "Settings", icon: "settings", access: "admin" },
];

function NavIcon({ name }: { name: string }) {
  if (name === "people") return <span aria-hidden>♙</span>;
  if (name === "checklist") return <span aria-hidden>☑</span>;
  if (name === "shield") return <span aria-hidden>◇</span>;
  if (name === "bell") return <span aria-hidden>◔</span>;
  if (name === "settings") return <span aria-hidden>⚙</span>;
  return <span aria-hidden>▦</span>;
}

export function AppShell({ user, children }: { user: AppUser; children: ReactNode }) {
  const visibleNavItems = navItems.filter((item) => {
    if (item.access === "all") return true;
    if (item.access === "admin") return canManageEmployees(user.role);
    return canReadHrWorkspace(user.role);
  });
  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" href="/dashboard">
          <span className="brand-mark">K</span>
          <span><strong>Kadris</strong><small>Support Services</small></span>
        </Link>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {visibleNavItems.map((item) => (
            <Link className="nav-link" href={item.href} key={item.href}>
              <NavIcon name={item.icon} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="avatar">{initials}</div>
          <div><strong>{user.name}</strong><small>{user.role.replaceAll("_", " ")} · <a href="/auth/logout">Sign out</a></small></div>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div><span className="environment-dot" /> Secure HR workspace</div>
          <div className="topbar-date">Kadris Support Services</div>
        </header>
        {children}
      </div>
    </div>
  );
}
