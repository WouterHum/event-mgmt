"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet } from "@/lib/api";

interface Event {
  id: number;
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
}
interface Presentation {
  id: number;
  title: string;
  room_name: string;
}
interface Stats {
  presentations_by_room: { [roomName: string]: Presentation[] };
}
interface RoomStatus {
  room_id: number;
  room_name: string;
  ip_address?: string;
  status: string;
  presentation_count: number;
}

export default function EventViewerDashboard() {
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [event, setEvent] = useState<Event | null>(null);
  const [stats, setStats] = useState<Stats | undefined>();
  const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
  const [loading, setLoading] = useState(true);

  // Load all events for the dropdown
  useEffect(() => {
    apiGet<Event[]>("/api/events")
      .then((data) => {
        setEvents(data);
        if (data.length) setSelectedEventId(data[0].id); // select first event by default
      })
      .catch(console.error);
  }, []);

  // Load data when selected event changes
  useEffect(() => {
    if (!selectedEventId) return;

    const loadData = async () => {
      setLoading(true);
      try {
        const [eventData, statsData, statusData] = await Promise.all([
          apiGet<Event>(`/api/events/${selectedEventId}`),
          apiGet<Stats>(`/api/events/${selectedEventId}/stats`),
          apiGet<RoomStatus[]>(`/api/events/${selectedEventId}/room-status`),
        ]);
        setEvent(eventData);
        setStats(statsData);
        setRoomStatuses(statusData);
      } catch (err) {
        console.error("Failed to load data:", err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [selectedEventId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Event Dropdown */}
      <div className="mb-6 text-center">
        <select
          value={selectedEventId || undefined}
          onChange={(e) => setSelectedEventId(Number(e.target.value))}
          className="border px-4 py-2 rounded-md w-full md:w-1/2"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} |{" "}
              {e.start_time ? new Date(e.start_time).toLocaleString() : "TBA"}
              {" - "}
              {e.end_time ? new Date(e.end_time).toLocaleString() : "TBA"}
              {" @ "}
              {e.location || "No location"}
            </option>
          ))}
        </select>
      </div>

      <h1 className="text-2xl font-bold mb-1">{event?.title} - Dashboard</h1>
      <p className="mb-6 text-gray-600">
        Manage rooms, uploads, and event status
      </p>

      {/* Total Presentations */}
      <div className="modern-card border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Total Presentations</h2>
        {stats?.presentations_by_room &&
          Object.entries(stats.presentations_by_room).map(
            ([roomName, presentations]) => (
              <div key={roomName} className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xl font-bold text-blue-600">
                    {roomName}
                  </h3>
                </div>
                <ul className="ml-4 list-disc text-sm text-gray-700">
                  {presentations.map((p) => (
                    <li
                      key={p.id}
                      className="flex justify-between items-center mb-1"
                    >
                      <span>{p.title}</span>
                      <button
                        onClick={async () => {
                          const response = await fetch(
                            `/api/files/events/${selectedEventId}/download/${p.id}`,
                          );

                          if (!response.ok) {
                            alert("Failed to download file");
                            return;
                          }
                          if (!response.ok) return alert("Download failed");
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const a = document.createElement("a");
                          a.href = url;
                          a.download = p.title;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          window.URL.revokeObjectURL(url);
                        }}
                        className="ml-2 px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-xs"
                      >
                        Download
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ),
          )}
      </div>

      {/* Presentations by Room */}
      <div className="modern-card border border-gray-200 rounded-xl p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Presentations by Room</h2>
        {stats?.presentations_by_room &&
        Object.keys(stats.presentations_by_room).length > 0 ? (
          <ul className="space-y-2">
            {Object.entries(stats.presentations_by_room).map(
              ([roomName, presentations]) => (
                <li key={roomName} className="flex justify-between text-sm">
                  <span className="text-gray-700">{roomName}</span>
                  <span className="font-semibold text-gray-900">
                    {presentations.length}
                  </span>
                </li>
              ),
            )}
          </ul>
        ) : (
          <p className="text-gray-500 text-sm">No presentations yet</p>
        )}
      </div>

      {/* Room PC Status */}
      <div className="modern-card border border-gray-200 rounded-xl p-6">
        <h2 className="text-lg font-semibold mb-4">Room PC Status</h2>
        {roomStatuses.length === 0 ? (
          <p className="text-gray-500 text-center py-4">
            No room status available
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {roomStatuses.map((rs) => (
              <div
                key={rs.room_id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      rs.status === "online"
                        ? "bg-green-500"
                        : rs.status === "warning"
                          ? "bg-amber-500"
                          : "bg-red-500"
                    }`}
                  />
                  <h4 className="font-semibold text-gray-800">
                    {rs.room_name}
                  </h4>
                </div>
                <p className="text-sm text-gray-600">
                  IP: {rs.ip_address || "Not assigned"}
                </p>
                <p className="text-sm text-gray-600">
                  Presentations: {rs.presentation_count}
                </p>
                <span
                  className={`inline-block mt-2 px-2 py-1 rounded text-xs font-semibold ${
                    rs.status === "online"
                      ? "bg-green-100 text-green-700"
                      : rs.status === "warning"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-red-100 text-red-700"
                  }`}
                >
                  {rs.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
