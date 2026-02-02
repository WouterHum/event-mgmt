"use client";

import { useEffect } from "react";
import { Button } from "@mui/material";
import { Calendar, Upload, Shield } from "lucide-react";

const HomePage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 via-white to-gray-100">
      <main className="container mx-auto px-6 py-20">
        <div className="mx-auto max-w-4xl text-center">
          {/* Heading */}
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight mb-6">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-indigo-500 to-pink-500 bg-clip-text text-transparent">
              EventHub
            </span>
          </h1>
          <p className="text-lg md:text-xl text-gray-600 mb-12">
            The complete event management platform for delegates, presenters,
            and administrators
          </p>

          {/* Call-to-action */}
          <div className="mb-16">
            <Button
              size="large"
              variant="contained"
              sx={{
                background:
                  "linear-gradient(90deg, rgba(99,102,241,1) 0%, rgba(236,72,153,1) 100%)",
                color: "#fff",
                padding: "0.75rem 2rem",
                fontSize: "1.1rem",
                borderRadius: "0.75rem",
                boxShadow:
                  "0 4px 6px rgba(0,0,0,0.1), 0 1px 3px rgba(0,0,0,0.06)",
                "&:hover": {
                  background:
                    "linear-gradient(90deg, rgba(79,70,229,1) 0%, rgba(219,39,119,1) 100%)",
                },
              }}
              onClick={() => (window.location.href = "/login")}
            >
              Get Started
            </Button>
          </div>

          {/* Feature cards */}
          <div className="grid gap-8 md:grid-cols-3">
            {/* Delegates */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-indigo-50 p-4">
                  <Calendar className="h-8 w-8 text-indigo-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Delegates</h3>
              <p className="text-gray-500 text-sm">
                Browse upcoming events, view details, and access presentations.
              </p>
            </div>

            {/* Presenters */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-pink-50 p-4">
                  <Upload className="h-8 w-8 text-pink-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Presenters</h3>
              <p className="text-gray-500 text-sm">
                Upload and manage your presentations for events.
              </p>
            </div>

            {/* Admins */}
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-lg hover:shadow-xl transition-shadow duration-300">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-green-50 p-4">
                  <Shield className="h-8 w-8 text-green-500" />
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">Admins</h3>
              <p className="text-gray-500 text-sm">
                Full control over events, presenters, and approvals.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default HomePage;
