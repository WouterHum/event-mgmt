"use client";

import { authAtom } from "./auth";
import { getDefaultStore } from "jotai";

const store = getDefaultStore();

function getAuthToken(): string | null {
  const auth = store.get(authAtom);
  return auth?.token || null;
}

export function saveAuth(token: string, role: string, email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth", JSON.stringify({ token, role, email }));
  }
}

export function loadAuth(): {
  token: string;
  role: string;
  email: string;
} | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth");
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

// --- API fetch wrappers ---

// GET
export async function apiGet<TResponse = unknown>(
  path: string
): Promise<TResponse> {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  return (await res.json()) as TResponse;
}

// POST
export async function apiPost<TRequest, TResponse = unknown>(
  path: string,
  body: TRequest
): Promise<TResponse> {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  return (await res.json()) as TResponse;
}

// PUT
export async function apiPut<TRequest, TResponse = unknown>(
  path: string,
  body: TRequest
): Promise<TResponse> {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  return (await res.json()) as TResponse;
}

// DELETE
export async function apiDelete<TResponse = unknown>(
  path: string
): Promise<TResponse> {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText);
  }

  return (await res.json()) as TResponse;
}
