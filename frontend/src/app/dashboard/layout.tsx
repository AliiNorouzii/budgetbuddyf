"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeftRight, LayoutDashboard, LogOut, PiggyBank, Tags, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage, useApi, type User } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/dashboard/transactions", label: "تراکنش‌ها", icon: ArrowLeftRight },
  { href: "/dashboard/accounts", label: "حساب‌ها", icon: Wallet },
  { href: "/dashboard/categories", label: "دسته‌بندی‌ها", icon: Tags },
  { href: "/dashboard/budgets", label: "بودجه‌ها", icon: PiggyBank },
];

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // A 401 here redirects to /login (see api()), which is what guards the dashboard.
  const { data, error } = useApi<{ user: User }>("/auth/me");

  const logout = async () => {
    try {
      await api("/auth/logout", { method: "POST" });
      router.replace("/login");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-muted md:flex-row">
      <aside className="flex shrink-0 flex-col justify-between gap-4 border-b bg-sidebar p-4 text-sidebar-foreground md:w-60 md:border-b-0 md:border-e">
        <div>
          <h2 className="mb-4 px-2 text-xl font-bold">BudgetBuddy</h2>
          <nav className="flex gap-1 overflow-x-auto md:flex-col">
            {NAV.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors hover:bg-sidebar-accent",
                  pathname === href && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )}
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center justify-between gap-2 md:flex-col md:items-stretch">
          {data ? (
            <div className="min-w-0 px-2 text-sm">
              <div className="truncate font-medium">{data.user.name}</div>
              <div className="truncate text-xs text-muted-foreground" dir="ltr">
                {data.user.email}
              </div>
            </div>
          ) : (
            <Skeleton className="h-9 w-32 md:w-full" />
          )}
          <Button variant="outline" onClick={logout}>
            <LogOut />
            خروج
          </Button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-4 md:p-8">
        {data ? (
          children
        ) : error ? (
          <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">{error}</div>
        ) : (
          <Skeleton className="h-40 w-full" />
        )}
      </main>
    </div>
  );
}
