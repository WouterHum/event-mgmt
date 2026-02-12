"use client";

import { authAtom } from "@/atoms/authAtom";
import { getDefaultStore } from "jotai";
import axios, { AxiosRequestConfig, AxiosResponse } from "axios";

const store = getDefaultStore();
const baseURL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface AuthData {
  token: string;
  role?: string | null;
  email?: string | null;
}

const client = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

// --- Auth Helpers ---
client.interceptors.request.use((config) => {
  const token = localStorage.getItem("authToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;

  // Remove Content-Type for FormData, let browser set it with boundary
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  

  return config;
});

// Response interceptor
client.interceptors.response.use(
  (response) => response, // pass successful responses
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid, redirect to login
      localStorage.removeItem("authToken"); // optional: clear token
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export function getAuthToken(): string | null {
  if (typeof window === "undefined") return null; // SSR safe

  const auth = store.get(authAtom);
  if (auth?.token) return auth.token;

  const raw = localStorage.getItem("auth");
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw);
    return parsed.token;
  } catch {
    return null;
  }
}

export function saveAuth(token: string, role: string, email: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem("auth", JSON.stringify({ token, role, email }));
}

export function loadAuth(): AuthData | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem("auth");
  if (!raw) return null;

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setAuth(token: string | null) {
  if (token) client.defaults.headers.common.Authorization = `Bearer ${token}`;
  else delete client.defaults.headers.common.Authorization;
}

// --- Axios response handler ---

async function handleAxiosResponse<T>(
  promise: Promise<AxiosResponse<T>>,
): Promise<T> {
  try {
    const res = await promise;
    return res.data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err) && err.response) {
      const msg =
        typeof err.response.data === "string"
          ? err.response.data
          : JSON.stringify(err.response.data);
      throw new Error(msg);
    }
    throw err instanceof Error ? err : new Error("Unknown API error");
  }
}

export default client;

// --- API Helpers ---

export async function apiGet<T>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<T> {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return handleAxiosResponse<T>(client.get(path, { ...config, headers }));
}

export async function apiPost<TRequest, TResponse = unknown>(
  path: string,
  data: TRequest,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const token = getAuthToken();
  const headers = {
    ...(data instanceof FormData ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...config?.headers,
  };


  return handleAxiosResponse<TResponse>(
    client.post(path, data, { ...config, headers }),
  );
}
export async function apiPut<TRequest, TResponse = unknown>(
  path: string,
  data: TRequest,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return handleAxiosResponse<TResponse>(
    client.put(path, data, { ...config, headers }),
  );
}

export async function apiDelete<TResponse = unknown>(
  path: string,
  config?: AxiosRequestConfig,
): Promise<TResponse> {
  const token = getAuthToken();
  const headers = token ? { Authorization: `Bearer ${token}` } : {};
  return handleAxiosResponse<TResponse>(
    client.delete(path, { ...config, headers }),
  );
}
