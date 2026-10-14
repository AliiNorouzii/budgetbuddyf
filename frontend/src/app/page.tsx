import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader>
          <CardTitle className="text-2xl">BudgetBuddy</CardTitle>
          <CardDescription>مدیریت ساده‌ی درآمد، هزینه و بودجه‌ی ماهانه</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Button asChild size="lg">
            <Link href="/login">ورود</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/register">ساخت حساب کاربری</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
