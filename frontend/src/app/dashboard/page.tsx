"use client";

import { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Plus, Scale, Wallet } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis } from "recharts";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { useApi, type Account, type Category, type Summary } from "@/lib/api";
import { formatDate, formatToman, monthLabel } from "@/lib/format";

const chartConfig = {
  income: { label: "درآمد", color: "#16a34a" },
  expense: { label: "هزینه", color: "#e11d48" },
} satisfies ChartConfig;

export default function DashboardPage() {
  const summary = useApi<Summary>("/transactions/summary");
  const accounts = useApi<Account[]>("/accounts");
  const categories = useApi<Category[]>("/categories");
  const [dialogOpen, setDialogOpen] = useState(false);

  const data = summary.data;
  const maxCategory = Math.max(1, ...(data?.expenseByCategory.map((c) => c.amount) ?? []));

  const stats = [
    { title: "درآمد این ماه", value: data?.income, icon: ArrowUpRight, className: "text-emerald-600" },
    { title: "هزینه این ماه", value: data?.expense, icon: ArrowDownRight, className: "text-rose-600" },
    { title: "تراز این ماه", value: data?.net, icon: Scale, className: "" },
    { title: "موجودی کل", value: data?.balance, icon: Wallet, className: "" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">داشبورد</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {data ? `خلاصه وضعیت مالی ${monthLabel(data.month)}` : "خلاصه وضعیت مالی"}
          </p>
        </div>
        <Button onClick={() => setDialogOpen(true)} disabled={!accounts.data || !categories.data}>
          <Plus />
          تراکنش جدید
        </Button>
      </div>

      {summary.error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">{summary.error}</div>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ title, value, icon: Icon, className }) => (
          <Card key={title}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-medium">{title}</CardTitle>
              <Icon className={`size-4 ${className}`} />
            </CardHeader>
            <CardContent>
              {value === undefined ? (
                <Skeleton className="h-8 w-32" />
              ) : (
                <div className={`text-2xl font-bold ${className}`}>{formatToman(value)}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>درآمد و هزینه در ۶ ماه اخیر</CardTitle>
          </CardHeader>
          <CardContent>
            {data ? (
              <ChartContainer config={chartConfig} className="aspect-auto h-64 w-full" dir="ltr">
                <BarChart data={data.trend.map((t) => ({ ...t, label: monthLabel(t.month) }))}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="income" fill="var(--color-income)" radius={4} />
                  <Bar dataKey="expense" fill="var(--color-expense)" radius={4} />
                </BarChart>
              </ChartContainer>
            ) : (
              <Skeleton className="h-64 w-full" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>هزینه‌های این ماه به تفکیک دسته‌بندی</CardTitle>
          </CardHeader>
          <CardContent>
            {!data ? (
              <Skeleton className="h-64 w-full" />
            ) : data.expenseByCategory.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">این ماه هزینه‌ای ثبت نشده است.</p>
            ) : (
              <ul className="space-y-3">
                {data.expenseByCategory.map((c) => (
                  <li key={c.id ?? "none"} className="space-y-1 text-sm">
                    <div className="flex justify-between gap-2">
                      <span>{c.name}</span>
                      <span className="text-muted-foreground">{formatToman(c.amount)}</span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${(c.amount / maxCategory) * 100}%`, backgroundColor: c.color }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>تراکنش‌های اخیر</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <Skeleton className="h-32 w-full" />
          ) : data.recent.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">هیچ تراکنشی یافت نشد.</p>
          ) : (
            <div className="divide-y">
              {data.recent.map((tx) => (
                <div key={tx.id} className="flex items-center justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <span className="block truncate font-medium">
                      {tx.description || tx.category?.name || "بدون توضیح"}
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {formatDate(tx.transactionDate)} · {tx.account.name}
                    </span>
                  </div>
                  <div
                    className={`font-semibold whitespace-nowrap ${
                      tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {tx.type === "INCOME" ? "+" : "−"}
                    {formatToman(tx.amount)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        onSaved={summary.reload}
      />
    </div>
  );
}
