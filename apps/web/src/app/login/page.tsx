"use client";
import { useState } from "react";
import {
  TextField,
  Button,
  Card,
  CardContent,
  Typography,
} from "@mui/material";
import { LockOutlined } from "@mui/icons-material";
import { useSetAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";
import { saveAuth } from "@/lib/api";
import { useRouter } from "next/navigation";
import { getBaseURL } from "@/lib/apiBase";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const setAuth = useSetAtom(authAtom);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const API_BASE = getBaseURL();
      console.log("[Login] Posting to:", `${API_BASE}/api/auth/login`);

      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        const text = await res.text();
        console.error("[Login] Response not OK:", res.status, text);
        throw new Error("Invalid credentials");
      }

      const data = await res.json();
      console.log("[Login] Success:", data);

      saveAuth(data.access_token, data.role, email);
      setAuth(data.access_token);

      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("[Login] Error:", err);
      setMessage(
        err instanceof Error ? err.message : "An unexpected error occurred",
      );
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <LockOutlined />
            <Typography variant="h5">Login</Typography>
          </div>

          <TextField
            label="Email"
            type="email"
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            label="Password"
            type="password"
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {message && (
            <Typography color="error" variant="body2">
              {message}
            </Typography>
          )}

          <Button variant="contained" color="primary" onClick={handleLogin}>
            Sign In
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
