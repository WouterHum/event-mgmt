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

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const setAuth = useSetAtom(authAtom);

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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || "Invalid credentials");
      }

      const data = await res.json();
      saveAuth(data.access_token, data.role, email);
      setAuth({ token: data.access_token, role: data.role, email });

      // ✅ redirect to dashboard
      window.location.href = "/dashboard";
    } catch (err: unknown) {
      if (err instanceof Error) {
        setMessage(err.message);
      } else {
        setMessage("An unexpected error occurred");
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <Card className="w-full max-w-md shadow-xl rounded-2xl">
        <CardContent className="flex flex-col gap-6 p-8">
          <div className="flex justify-center">
            <LockOutlined fontSize="large" className="text-blue-500" />
          </div>
          <Typography variant="h5" align="center" className="font-bold">
            Login
          </Typography>

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

          <Button
            variant="contained"
            color="primary"
            fullWidth
            onClick={handleLogin}
          >
            Login
          </Button>

          {message && (
            <Typography align="center" color="error">
              {message}
            </Typography>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
