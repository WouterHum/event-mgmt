"use client";

import { authAtom } from "./auth";
import { getDefaultStore } from "jotai";

const store = getDefaultStore();

function getAuthToken() {
  const auth = store.get(authAtom);
  return auth?.token || null;
}

export function saveAuth(token: string, role: string, email: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem("auth", JSON.stringify({ token, role, email }));
  }
}

export function loadAuth() {
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
export async function apiGet(path: string) {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPost(path: string, body: any) {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiPut(path: string, body: any) {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function apiDelete(path: string) {
  const token = getAuthToken();
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
