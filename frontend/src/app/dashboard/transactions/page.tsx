"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { TransactionDialog } from "@/components/transaction-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, errorMessage, useApi, type Account, type Category, type Transaction } from "@/lib/api";
import { formatDate, formatToman } from "@/lib/format";

const ALL = "ALL";

const EMPTY_FILTERS = { type: ALL, accountId: ALL, categoryId: ALL, from: "", to: "", q: "" };

function toQuery(filters: typeof EMPTY_FILTERS): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value && value !== ALL) params.set(key, value);
  }
  const query = params.toString();
  return query ? `?${query}` : "";
}

export default function TransactionsPage() {
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [search, setSearch] = useState("");
  const transactions = useApi<Transaction[]>(`/transactions${toQuery(filters)}`);
  const accounts = useApi<Account[]>("/accounts");
  const categories = useApi<Category[]>("/categories");

  // `null` = creating, a transaction = editing, `undefined` = dialog closed.
  const [editing, setEditing] = useState<Transaction | null | undefined>(undefined);

  const setFilter = (key: keyof typeof EMPTY_FILTERS, value: string) =>
    setFilters((f) => ({ ...f, [key]: value }));

  const remove = async (tx: Transaction) => {
    if (!window.confirm("این تراکنش حذف شود؟")) return;
    try {
      await api(`/transactions/${tx.id}`, { method: "DELETE" });
      toast.success("تراکنش حذف شد.");
      transactions.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">تراکنش‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">مشاهده، جستجو و فیلتر تاریخچه‌ی تراکنش‌ها</p>
        </div>
        <Button onClick={() => setEditing(null)} disabled={!accounts.data || !categories.data}>
          <Plus />
          تراکنش جدید
        </Button>
      </div>

      <Card>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2">
            <Label>نوع</Label>
            <Select value={filters.type} onValueChange={(v) => setFilter("type", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه</SelectItem>
                <SelectItem value="INCOME">درآمد</SelectItem>
                <SelectItem value="EXPENSE">هزینه</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>حساب</Label>
            <Select value={filters.accountId} onValueChange={(v) => setFilter("accountId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه‌ی حساب‌ها</SelectItem>
                {accounts.data?.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>دسته‌بندی</Label>
            <Select value={filters.categoryId} onValueChange={(v) => setFilter("categoryId", v)}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>همه‌ی دسته‌بندی‌ها</SelectItem>
                {categories.data?.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-from">از تاریخ</Label>
            <Input
              id="filter-from"
              type="date"
              value={filters.from}
              onChange={(e) => setFilter("from", e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="filter-to">تا تاریخ</Label>
            <Input id="filter-to" type="date" value={filters.to} onChange={(e) => setFilter("to", e.target.value)} />
          </div>

          <form
            className="space-y-2"
            onSubmit={(e) => {
              e.preventDefault();
              setFilter("q", search.trim());
            }}
          >
            <Label htmlFor="filter-q">جستجو در توضیح</Label>
            <div className="flex gap-2">
              <Input id="filter-q" value={search} onChange={(e) => setSearch(e.target.value)} />
              <Button type="submit" variant="outline">
                جستجو
              </Button>
            </div>
          </form>

          <div className="sm:col-span-2 lg:col-span-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setFilters(EMPTY_FILTERS);
                setSearch("");
              }}
            >
              پاک کردن فیلترها
            </Button>
          </div>
        </CardContent>
      </Card>

      {transactions.error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">{transactions.error}</div>
      )}

      <Card>
        <CardContent>
          {!transactions.data ? (
            transactions.error ? null : (
              <Skeleton className="h-48 w-full" />
            )
          ) : transactions.data.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">تراکنشی با این فیلترها پیدا نشد.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">تاریخ</TableHead>
                  <TableHead className="text-start">توضیح</TableHead>
                  <TableHead className="text-start">حساب</TableHead>
                  <TableHead className="text-start">دسته‌بندی</TableHead>
                  <TableHead className="text-start">مبلغ</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.data.map((tx) => (
                  <TableRow key={tx.id}>
                    <TableCell className="whitespace-nowrap">{formatDate(tx.transactionDate)}</TableCell>
                    <TableCell className="font-medium">{tx.description || "—"}</TableCell>
                    <TableCell>{tx.account.name}</TableCell>
                    <TableCell>
                      {tx.category ? (
                        <Badge variant="outline">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: tx.category.color ?? "#94a3b8" }}
                          />
                          {tx.category.name}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell
                      className={`font-semibold whitespace-nowrap ${
                        tx.type === "INCOME" ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {tx.type === "INCOME" ? "+" : "−"}
                      {formatToman(tx.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon-sm" title="ویرایش" onClick={() => setEditing(tx)}>
                          <Pencil />
                        </Button>
                        <Button variant="ghost" size="icon-sm" title="حذف" onClick={() => remove(tx)}>
                          <Trash2 className="text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <TransactionDialog
        open={editing !== undefined}
        onOpenChange={(open) => !open && setEditing(undefined)}
        transaction={editing}
        accounts={accounts.data ?? []}
        categories={categories.data ?? []}
        onSaved={transactions.reload}
      />
    </div>
  );
}
