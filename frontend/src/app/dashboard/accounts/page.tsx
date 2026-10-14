"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage, useApi, type Account, type AccountType } from "@/lib/api";
import { ACCOUNT_TYPE_LABELS, formatToman } from "@/lib/format";

export default function AccountsPage() {
  const accounts = useApi<Account[]>("/accounts");
  // `null` = creating, an account = editing, `undefined` = dialog closed.
  const [editing, setEditing] = useState<Account | null | undefined>(undefined);

  const remove = async (account: Account) => {
    if (!window.confirm(`حساب «${account.name}» و همه‌ی تراکنش‌های آن حذف شود؟`)) return;
    try {
      await api(`/accounts/${account.id}`, { method: "DELETE" });
      toast.success("حساب حذف شد.");
      accounts.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">حساب‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">حساب‌های بانکی، کارت‌ها و کیف پول‌های شما</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus />
          حساب جدید
        </Button>
      </div>

      {accounts.error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">{accounts.error}</div>
      )}

      {!accounts.data ? (
        accounts.error ? null : (
          <Skeleton className="h-32 w-full" />
        )
      ) : accounts.data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">هنوز حسابی نساخته‌اید.</p>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {accounts.data.map((account) => (
            <Card key={account.id}>
              <CardHeader>
                <CardTitle>{account.name}</CardTitle>
                <CardDescription>{ACCOUNT_TYPE_LABELS[account.type]}</CardDescription>
                <CardAction className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" title="ویرایش" onClick={() => setEditing(account)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="حذف" onClick={() => remove(account)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </CardAction>
              </CardHeader>
              <CardContent>
                <div className={`text-xl font-bold ${account.balance < 0 ? "text-rose-600" : ""}`}>
                  {formatToman(account.balance)}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش حساب" : "حساب جدید"}</DialogTitle>
          </DialogHeader>
          <AccountForm
            account={editing ?? null}
            onClose={() => setEditing(undefined)}
            onSaved={accounts.reload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function AccountForm({
  account,
  onClose,
  onSaved,
}: {
  account: Account | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<AccountType>(account?.type ?? "BANK");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (account) {
        await api(`/accounts/${account.id}`, { method: "PATCH", body: { name, type } });
      } else {
        await api("/accounts", { method: "POST", body: { name, type } });
      }
      toast.success(account ? "حساب ویرایش شد." : "حساب ساخته شد.");
      onSaved();
      onClose();
    } catch (err) {
      toast.error(errorMessage(err));
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="grid gap-4">
      <div className="space-y-2">
        <Label htmlFor="account-name">نام حساب</Label>
        <Input
          id="account-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label>نوع حساب</Label>
        <Select value={type} onValueChange={(v) => setType(v as AccountType)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {ACCOUNT_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
