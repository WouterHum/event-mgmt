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
import { authAtom } from "@/lib/auth";
import { saveAuth } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function HomePage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const setAuth = useSetAtom(authAtom);
  const router = useRouter();

  const handleLogin = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/auth/login`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        }
      );

      if (!res.ok) throw new Error("Invalid credentials");

      const data = await res.json();

      // persist locally + set atom
      saveAuth(data.access_token, data.role, email);
      setAuth({ token: data.access_token, role: data.role, email });

      // redirect to dashboard
      router.push("/dashboard");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("An unexpected error occurred");
      }
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
