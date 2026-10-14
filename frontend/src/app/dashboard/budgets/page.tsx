"use client";

import { useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage, useApi, type Budget, type Category } from "@/lib/api";
import { currentMonth, formatToman, monthLabel } from "@/lib/format";

export default function BudgetsPage() {
  const [month, setMonth] = useState(currentMonth);
  const budgets = useApi<Budget[]>(`/budgets?month=${month}`);
  const categories = useApi<Category[]>("/categories");
  // `null` = creating, a budget = editing, `undefined` = dialog closed.
  const [editing, setEditing] = useState<Budget | null | undefined>(undefined);

  const remove = async (budget: Budget) => {
    if (!window.confirm(`بودجه‌ی «${budget.category.name}» حذف شود؟`)) return;
    try {
      await api(`/budgets/${budget.id}`, { method: "DELETE" });
      toast.success("بودجه حذف شد.");
      budgets.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  // The list may still hold the previous month while the new one loads.
  const list = budgets.data?.filter((b) => b.month === month);
  const usedCategoryIds = new Set(list?.map((b) => b.category.id));
  const freeCategories = categories.data?.filter((c) => !usedCategoryIds.has(c.id)) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">بودجه‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">سقف هزینه‌ی ماهانه برای هر دسته‌بندی — {monthLabel(month)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="month"
            aria-label="ماه"
            className="w-44"
            value={month}
            onChange={(e) => e.target.value && setMonth(e.target.value)}
          />
          <Button onClick={() => setEditing(null)} disabled={!categories.data || !list}>
            <Plus />
            بودجه جدید
          </Button>
        </div>
      </div>

      {budgets.error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">{budgets.error}</div>
      )}

      {!list ? (
        budgets.error ? null : (
          <Skeleton className="h-32 w-full" />
        )
      ) : list.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">برای این ماه بودجه‌ای تعریف نشده است.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((budget) => {
            const percentage = Math.round((budget.spent / budget.limitAmount) * 100);
            const remaining = budget.limitAmount - budget.spent;
            return (
              <Card key={budget.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <span
                      className="size-3 shrink-0 rounded-full"
                      style={{ backgroundColor: budget.category.color ?? "#94a3b8" }}
                    />
                    {budget.category.name}
                  </CardTitle>
                  <CardDescription>
                    <Badge variant={remaining < 0 ? "destructive" : percentage >= 80 ? "secondary" : "outline"}>
                      {percentage.toLocaleString("fa-IR")}٪ مصرف شده
                    </Badge>
                  </CardDescription>
                  <CardAction className="flex gap-1">
                    <Button variant="ghost" size="icon-sm" title="ویرایش" onClick={() => setEditing(budget)}>
                      <Pencil />
                    </Button>
                    <Button variant="ghost" size="icon-sm" title="حذف" onClick={() => remove(budget)}>
                      <Trash2 className="text-destructive" />
                    </Button>
                  </CardAction>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="text-muted-foreground">خرج‌شده: {formatToman(budget.spent)}</span>
                    <span className="font-medium">سقف: {formatToman(budget.limitAmount)}</span>
                  </div>
                  <Progress value={Math.min(percentage, 100)} className="h-2" />
                  <p className={remaining < 0 ? "font-medium text-destructive" : "text-muted-foreground"}>
                    {remaining < 0
                      ? `${formatToman(-remaining)} بیشتر از بودجه`
                      : `باقی‌مانده: ${formatToman(remaining)}`}
                  </p>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `ویرایش بودجه‌ی ${editing.category.name}` : "بودجه جدید"}</DialogTitle>
          </DialogHeader>
          <BudgetForm
            budget={editing ?? null}
            month={month}
            categories={freeCategories}
            onClose={() => setEditing(undefined)}
            onSaved={budgets.reload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BudgetForm({
  budget,
  month,
  categories,
  onClose,
  onSaved,
}: {
  budget: Budget | null;
  month: string;
  /** Categories that have no budget in `month` yet. */
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [limitAmount, setLimitAmount] = useState(budget ? String(budget.limitAmount) : "");
  const [saving, setSaving] = useState(false);

  if (!budget && categories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        دسته‌بندی بدون بودجه‌ای برای این ماه باقی نمانده است.{" "}
        <Link href="/dashboard/categories" className="text-primary hover:underline" onClick={onClose}>
          ساخت دسته‌بندی
        </Link>
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (budget) {
        await api(`/budgets/${budget.id}`, { method: "PATCH", body: { limitAmount: Number(limitAmount) } });
      } else {
        await api("/budgets", { method: "POST", body: { categoryId, month, limitAmount: Number(limitAmount) } });
      }
      toast.success(budget ? "بودجه ویرایش شد." : "بودجه ساخته شد.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      {!budget && (
        <div className="space-y-2">
          <Label>دسته‌بندی</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="space-y-2">
        <Label htmlFor="budget-limit">سقف بودجه (تومان)</Label>
        <Input
          id="budget-limit"
          type="number"
          dir="ltr"
          inputMode="numeric"
          min={1}
          step={1}
          required
          value={limitAmount}
          onChange={(e) => setLimitAmount(e.target.value)}
        />
      </div>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>
          انصراف
        </Button>
        <Button type="submit" disabled={saving}>
          {saving ? "در حال ذخیره..." : "ذخیره"}
        </Button>
      </DialogFooter>
    </form>
  );
}
