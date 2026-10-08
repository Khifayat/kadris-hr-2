import Link from "next/link";
import Image from "next/image";
import type { ReactNode } from "react";
import type { AppUser } from "@/lib/auth/session";
import { canManageEmployees, canReadHrWorkspace } from "@/lib/permissions/roles";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "grid", access: "hr" },
  { href: "/my-requirements", label: "My Tasks", icon: "checklist", access: "all" },
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
          <Image className="brand-logo" src="/brand/kadris-support-systems.png" alt="Kadris Support Systems" width={1024} height={461} priority />
        </Link>
        <nav aria-label="Primary navigation">
          <p className="nav-label">Workspace</p>
          {visibleNavItems.map((item) => (
            <Link className="nav-link" href={item.href} key={item.href}>
              <NavIcon name={item.icon} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer-actions">
          <a href="/auth/logout">Sign out</a>
        </div>
      </aside>
      <div className="app-content">
        <header className="topbar">
          <div className="topbar-actions">
            <Link className="header-profile-link" href="/profile" aria-label={`Open profile for ${user.name}`}>
              <span className="avatar">{initials}</span>
              <span><strong>{user.name}</strong><small>{user.role.replaceAll("_", " ")}</small></span>
            </Link>
          </div>
        </header>
        {children}
      </div>
    </div>
  );
}
