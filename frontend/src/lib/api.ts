"use client";

import { useCallback, useEffect, useState } from "react";

export type TransactionType = "INCOME" | "EXPENSE";
export type AccountType = "CASH" | "BANK" | "CARD" | "DIGITAL_WALLET";

export type User = { id: string; name: string; email: string };

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  createdAt: string;
};

export type Category = {
  id: string;
  name: string;
  color: string | null;
  icon: string | null;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  transactionDate: string;
  description: string | null;
  account: { id: string; name: string };
  category: Category | null;
  createdAt: string;
};

export type Summary = {
  month: string;
  income: number;
  expense: number;
  net: number;
  balance: number;
  expenseByCategory: { id: string | null; name: string; color: string; amount: number }[];
  trend: { month: string; income: number; expense: number }[];
  recent: Transaction[];
};

export type Budget = {
  id: string;
  month: string;
  limitAmount: number;
  spent: number;
  category: Category;
};

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error && error.message ? error.message : "خطایی رخ داد. دوباره تلاش کنید.";
}

type ApiOptions = { method?: "GET" | "POST" | "PATCH" | "DELETE"; body?: unknown };

/** Calls the backend through the same-origin /api proxy (see next.config.ts). */
export async function api<T = void>(path: string, { method = "GET", body }: ApiOptions = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? undefined : { "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError("ارتباط با سرور برقرار نشد.", 0);
  }

  if (res.ok) {
    return (res.status === 204 ? undefined : await res.json()) as T;
  }

  // An expired session anywhere inside the app sends the user back to login.
  if (res.status === 401 && window.location.pathname.startsWith("/dashboard")) {
    window.location.assign("/login");
  }

  const data = (await res.json().catch(() => null)) as { message?: string | string[] } | null;
  const message = Array.isArray(data?.message) ? data.message.join(" ") : data?.message;
  throw new ApiError(message || "خطایی رخ داد. دوباره تلاش کنید.", res.status);
}

/** GETs `path` and keeps the result; `reload()` refetches after a mutation. */
export function useApi<T>(path: string) {
  const [state, setState] = useState<{ data?: T; error?: string }>({});
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api<T>(path).then(
      (data) => {
        if (!cancelled) setState({ data });
      },
      (error: unknown) => {
        if (!cancelled) setState((s) => ({ ...s, error: errorMessage(error) }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [path, version]);

  const reload = useCallback(() => setVersion((v) => v + 1), []);

  return {
    data: state.data,
    error: state.error,
    loading: state.data === undefined && state.error === undefined,
    reload,
  };
}
