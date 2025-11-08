"use client";

import {
  Event,
  Person,
  MeetingRoom,
  People,
  CloudUpload,
} from "@mui/icons-material";

interface Tile {
  title: string;
  href: string;
  icon: React.ReactNode;
  description: string;
  color: string;
  bg: string;
}

export default function AdminDashboard() {
  const tiles: Tile[] = [
    {
      title: "Manage Events",
      href: "/events",
      icon: <Event fontSize="large" />,
      description: "Create and manage conference events",
      color: "text-pink-600",
      bg: "bg-pink-100",
    },
    {
      title: "Manage Speakers",
      href: "/speakers",
      icon: <Person fontSize="large" />,
      description: "Add and organize speaker profiles",
      color: "text-indigo-600",
      bg: "bg-indigo-100",
    },
    {
      title: "Manage Rooms",
      href: "/rooms",
      icon: <MeetingRoom fontSize="large" />,
      description: "Configure venue rooms and spaces",
      color: "text-teal-600",
      bg: "bg-teal-100",
    },
    {
      title: "Manage Attendees",
      href: "/attendees",
      icon: <People fontSize="large" />,
      description: "Track and manage attendees",
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    {
      title: "Manage Uploads",
      href: "/uploader",
      icon: <CloudUpload fontSize="large" />,
      description: "Upload and organize media files",
      color: "text-purple-600",
      bg: "bg-purple-100",
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage your conference platform from one central location
        </p>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto">
        {tiles.map((tile) => (
          <a
            key={tile.title}
            href={tile.href}
            className="bg-card border border-gray-200 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all hover:-translate-y-1"
          >
            <div
              className={`flex items-center justify-center w-14 h-14 mb-4 rounded-xl ${tile.bg} ${tile.color}`}
            >
              {tile.icon}
            </div>
            <h3 className="text-lg font-semibold mb-1">{tile.title}</h3>
            <p className="text-muted-foreground mb-4">{tile.description}</p>

            <button className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all">
              Open
            </button>
          </a>
        ))}
      </div>
    </div>
  );
}
