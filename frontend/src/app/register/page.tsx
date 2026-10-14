"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { api, errorMessage } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await api("/auth/register", { method: "POST", body: { name, email, password } });
      router.replace("/dashboard");
    } catch (err) {
      setError(errorMessage(err));
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>ساخت حساب کاربری</CardTitle>
          <CardDescription>مدیریت دخل و خرج خود را با BudgetBuddy شروع کنید.</CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-destructive/15 p-3 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="name">نام</Label>
              <Input
                id="name"
                autoComplete="name"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">ایمیل</Label>
              <Input
                id="email"
                type="email"
                dir="ltr"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">کلمه عبور (حداقل ۸ کاراکتر)</Label>
              <Input
                id="password"
                type="password"
                dir="ltr"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="mt-4 flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "در حال ثبت نام..." : "ثبت نام"}
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              قبلاً ثبت نام کرده‌اید؟{" "}
              <Link href="/login" className="text-primary hover:underline">
                وارد شوید
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
