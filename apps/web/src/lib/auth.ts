"use client";

import { atom } from "jotai";

export interface AuthState {
  token: string | null;
  role: string | null;
  email: string | null;
}

export const authAtom = atom<AuthState>({
  token: null,
  role: null,
  email: null,
});
