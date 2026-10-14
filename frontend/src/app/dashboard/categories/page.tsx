"use client";

import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { api, errorMessage, useApi, type Category } from "@/lib/api";

const DEFAULT_COLOR = "#3b82f6";

export default function CategoriesPage() {
  const categories = useApi<Category[]>("/categories");
  // `null` = creating, a category = editing, `undefined` = dialog closed.
  const [editing, setEditing] = useState<Category | null | undefined>(undefined);

  const remove = async (category: Category) => {
    if (!window.confirm(`دسته‌بندی «${category.name}» حذف شود؟`)) return;
    try {
      await api(`/categories/${category.id}`, { method: "DELETE" });
      toast.success("دسته‌بندی حذف شد.");
      categories.reload();
    } catch (err) {
      toast.error(errorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">دسته‌بندی‌ها</h1>
          <p className="mt-1 text-sm text-muted-foreground">دسته‌بندی‌هایی که تراکنش‌ها را با آن‌ها مرتب می‌کنید</p>
        </div>
        <Button onClick={() => setEditing(null)}>
          <Plus />
          دسته‌بندی جدید
        </Button>
      </div>

      {categories.error && (
        <div className="rounded-lg bg-destructive/15 p-4 text-sm text-destructive">{categories.error}</div>
      )}

      {!categories.data ? (
        categories.error ? null : (
          <Skeleton className="h-32 w-full" />
        )
      ) : categories.data.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">هنوز دسته‌بندی‌ای نساخته‌اید.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {categories.data.map((category) => (
            <Card key={category.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: category.color ?? "#94a3b8" }}
                  />
                  {category.name}
                </CardTitle>
                <CardAction className="flex gap-1">
                  <Button variant="ghost" size="icon-sm" title="ویرایش" onClick={() => setEditing(category)}>
                    <Pencil />
                  </Button>
                  <Button variant="ghost" size="icon-sm" title="حذف" onClick={() => remove(category)}>
                    <Trash2 className="text-destructive" />
                  </Button>
                </CardAction>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={editing !== undefined} onOpenChange={(open) => !open && setEditing(undefined)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "ویرایش دسته‌بندی" : "دسته‌بندی جدید"}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            category={editing ?? null}
            onClose={() => setEditing(undefined)}
            onSaved={categories.reload}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryForm({
  category,
  onClose,
  onSaved,
}: {
  category: Category | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(category?.name ?? "");
  const [color, setColor] = useState(category?.color ?? DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (category) {
        await api(`/categories/${category.id}`, { method: "PATCH", body: { name, color } });
      } else {
        await api("/categories", { method: "POST", body: { name, color } });
      }
      toast.success(category ? "دسته‌بندی ویرایش شد." : "دسته‌بندی ساخته شد.");
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
        <Label htmlFor="category-name">نام</Label>
        <Input
          id="category-name"
          required
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="category-color">رنگ</Label>
        <Input
          id="category-color"
          type="color"
          className="w-20 p-1"
          value={color}
          onChange={(e) => setColor(e.target.value)}
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
