import { useSetAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";
import { clearAuth } from "@/lib/auth";

export function useLogout() {
  const setAuth = useSetAtom(authAtom);

  return () => {
    clearAuth(); // removes token, role, email from localStorage
    setAuth({ token: null, role: null, email: null }); // resets atom state
  };
}
