"use client";
import { getDefaultStore } from "jotai";
import { authAtom } from "@/atoms/authAtom";

const store = getDefaultStore();

export interface AuthState {
  token: string | null;
  role?: string | null;
  email?: string | null;
}

// --- localStorage keys ---
const TOKEN_KEY = "event_auth_token";
const ROLE_KEY = "event_auth_role";
const EMAIL_KEY = "event_auth_email";

// Save token/role/email
export function saveAuth(token: string, role?: string, email?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, token);
  if (role) localStorage.setItem(ROLE_KEY, role);
  if (email) localStorage.setItem(EMAIL_KEY, email);
}

// Clear auth
export function clearAuth() {
  if (typeof window !== "undefined") {
    localStorage.removeItem("auth");
  }

  store.set(authAtom, {
    token: null,
    role: null,
    email: null,
  });
}

// Load auth from localStorage
export function loadAuth(): AuthState {
  if (typeof window === "undefined") return { token: null, role: null, email: null };

  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const role = localStorage.getItem(ROLE_KEY);
    const email = localStorage.getItem(EMAIL_KEY);

    return {
      token: token && token !== "null" ? token : null,
      role: role && role !== "null" ? role : null,
      email: email && email !== "null" ? email : null,
    };
  } catch (error) {
    console.error("[loadAuth] failed to read auth:", error);
    return { token: null, role: null, email: null };
  }
}

// Check if token is expired
export function isTokenExpired(token: string) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  } catch (err) {
    console.error("[isTokenExpired] token parse failed:", err);
    return true;
  }
}
