"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  BookOpen,
  Users,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Calendar,
  LogOut,
  LayoutDashboard,
  Library,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    title: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["ADMIN", "LIBRARIAN", "TEACHER", "STUDENT"],
  },
  {
    title: "Books",
    href: "/books",
    icon: BookOpen,
    roles: ["ADMIN", "LIBRARIAN", "TEACHER", "STUDENT"],
  },
  {
    title: "Members",
    href: "/members",
    icon: Users,
    roles: ["ADMIN", "LIBRARIAN"],
  },
  {
    title: "Circulation",
    href: "/circulation",
    icon: ArrowLeftRight,
    roles: ["ADMIN", "LIBRARIAN"],
  },
  {
    title: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "LIBRARIAN"],
  },
  {
    title: "Academic Years",
    href: "/academic-years",
    icon: Calendar,
    roles: ["ADMIN"],
  },
  {
    title: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const userRole = session?.user?.role ?? "STUDENT";

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(userRole)
  );

  return (
    <aside className="flex h-screen w-64 flex-col border-r bg-card">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <Library className="h-6 w-6 text-primary" />
        <span className="text-lg font-bold">School Library</span>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {visibleItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.title}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t p-4">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium">{session?.user?.name}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {userRole.toLowerCase()}
          </p>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
