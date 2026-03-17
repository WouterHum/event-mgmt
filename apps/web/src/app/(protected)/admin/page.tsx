"use client";

import { Event } from "@mui/icons-material";

export default function AdminDashboard() {
  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your conference platform from one central location
        </p>
      </div>

      <div className="flex justify-center">
        <a
          href="/events"
          className="bg-card border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1 w-72"
        >
          <div className="flex items-center justify-center w-14 h-14 mb-4 rounded-xl bg-pink-100 text-pink-600">
            <Event fontSize="large" />
          </div>
          <h3 className="text-lg font-semibold mb-1">Manage Events</h3>
          <p className="text-muted-foreground mb-4">
            Create and manage conference events
          </p>
          <button className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all">
            Open
          </button>
        </a>
      </div>
    </div>
  );
}