"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api, errorMessage, type Account, type Category, type Transaction, type TransactionType } from "@/lib/api";
import { today } from "@/lib/format";

const NO_CATEGORY = "none";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** When set, the dialog edits this transaction instead of creating one. */
  transaction?: Transaction | null;
  accounts: Account[];
  categories: Category[];
  onSaved: () => void;
};

export function TransactionDialog({ open, onOpenChange, ...form }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{form.transaction ? "ویرایش تراکنش" : "تراکنش جدید"}</DialogTitle>
          <DialogDescription>مبلغ را به تومان وارد کنید.</DialogDescription>
        </DialogHeader>
        {/* Mounted only while open, so the fields reset on every open. */}
        <TransactionForm {...form} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function TransactionForm({
  transaction,
  accounts,
  categories,
  onSaved,
  onClose,
}: Omit<Props, "open" | "onOpenChange"> & { onClose: () => void }) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? "EXPENSE");
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : "");
  const [accountId, setAccountId] = useState(transaction?.account.id ?? accounts[0]?.id ?? "");
  const [categoryId, setCategoryId] = useState(transaction?.category?.id ?? NO_CATEGORY);
  const [date, setDate] = useState(transaction ? transaction.transactionDate.slice(0, 10) : today());
  const [description, setDescription] = useState(transaction?.description ?? "");
  const [saving, setSaving] = useState(false);

  if (accounts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        برای ثبت تراکنش ابتدا باید یک حساب بسازید.{" "}
        <Link href="/dashboard/accounts" className="text-primary hover:underline" onClick={onClose}>
          ساخت حساب
        </Link>
      </p>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const body = {
      type,
      amount: Number(amount),
      accountId,
      categoryId: categoryId === NO_CATEGORY ? null : categoryId,
      transactionDate: date,
      description,
    };
    try {
      if (transaction) {
        await api(`/transactions/${transaction.id}`, { method: "PATCH", body });
      } else {
        await api("/transactions", { method: "POST", body });
      }
      toast.success(transaction ? "تراکنش ویرایش شد." : "تراکنش ثبت شد.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>نوع</Label>
          <Select value={type} onValueChange={(v) => setType(v as TransactionType)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXPENSE">هزینه</SelectItem>
              <SelectItem value="INCOME">درآمد</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="tx-amount">مبلغ (تومان)</Label>
          <Input
            id="tx-amount"
            type="number"
            dir="ltr"
            inputMode="numeric"
            min={1}
            step={1}
            required
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>حساب</Label>
          <Select value={accountId} onValueChange={setAccountId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {accounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>دسته‌بندی</Label>
          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={NO_CATEGORY}>بدون دسته‌بندی</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-date">تاریخ</Label>
        <Input id="tx-date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="tx-description">توضیح</Label>
        <Input
          id="tx-description"
          maxLength={200}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
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
