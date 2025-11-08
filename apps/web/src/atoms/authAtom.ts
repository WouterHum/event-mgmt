// 🗂️ atoms/authAtom.ts
import { atom } from "jotai";

export type AuthState = {
  token: string | null;
  role?: string | null;
  email?: string | null;
  loaded?: boolean; 
};

export const authAtom = atom<AuthState>({
  token: null,
  role: null,
  email: null,
  loaded: false,
});
