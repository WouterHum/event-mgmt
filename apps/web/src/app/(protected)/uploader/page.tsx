"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";
import { useSearchParams } from "next/navigation";
import { useAtom } from "jotai";
import { selectedEventAtom } from "@/app/components/NavBar";

interface Presentation {
  id: number;
  filename: string;
  uploaded: boolean;
  speaker_id: number;
  speaker_name?: string;
}

interface RoomStats {
  room_name: string;
  room_id: number | null;
  total: number;
  uploaded: number;
  presentations: Presentation[];
}

interface EventStats {
  event_id: number;
  total_presentations: number;
  total_uploaded: number;
  rooms: RoomStats[];
}

export default function UploaderPage() {
  const searchParams = useSearchParams();
  const [selectedEvent] = useAtom(selectedEventAtom);

  // FIX #9: Get eventId from URL param (set by NavBar link), no event selector UI
  const eventIdFromUrl = searchParams.get("eventId")
    ? Number(searchParams.get("eventId"))
    : selectedEvent?.id ?? null;

  const [stats, setStats] = useState<EventStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRooms, setExpandedRooms] = useState<Set<string>>(new Set());
  const [uploadingId, setUploadingId] = useState<number | null>(null);

  useEffect(() => {
    if (eventIdFromUrl) loadStats(eventIdFromUrl);
  }, [eventIdFromUrl]);

  const loadStats = async (eventId: number) => {
    try {
      setLoading(true);
      const data = await apiGet<EventStats>(`/api/events/${eventId}/stats`);
      setStats(data);
      // Auto-expand all rooms
      setExpandedRooms(new Set(data.rooms.map((r) => r.room_name)));
    } catch (err) {
      console.error("Failed to load event stats:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleRoom = (roomName: string) => {
    setExpandedRooms((prev) => {
      const next = new Set(prev);
      if (next.has(roomName)) next.delete(roomName);
      else next.add(roomName);
      return next;
    });
  };

  const handleUpload = async (sessionId: number, speakerId: number, file: File) => {
    try {
      setUploadingId(sessionId);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}/api/speakers/${speakerId}/sessions/${sessionId}/upload`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("authToken") || ""}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Upload failed");
      if (eventIdFromUrl) await loadStats(eventIdFromUrl);
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload failed");
    } finally {
      setUploadingId(null);
    }
  };

  if (!eventIdFromUrl) {
    return (
      <div className="p-8 text-center text-gray-500">
        <p className="text-lg font-medium mb-2">No event selected</p>
        <p className="text-sm">Please go to <a href="/events" className="text-blue-600 hover:underline">Events</a> and open an event first.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!stats) return null;

  const uploadPercent = stats.total_presentations > 0
    ? Math.round((stats.total_uploaded / stats.total_presentations) * 100)
    : 0;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="page-header">
        <h1 className="page-title">Presentations</h1>
        {selectedEvent && (
          <p className="page-subtitle">{selectedEvent.title}</p>
        )}
      </div>

      {/* FIX #9: Overall summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-gray-800">{stats.total_presentations}</p>
          <p className="text-sm text-gray-500 mt-1">Total Presentations</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{stats.total_uploaded}</p>
          <p className="text-sm text-gray-500 mt-1">Loaded</p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-orange-500">
            {stats.total_presentations - stats.total_uploaded}
          </p>
          <p className="text-sm text-gray-500 mt-1">Missing</p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between text-sm text-gray-500 mb-1">
          <span>Overall progress</span>
          <span>{stats.total_uploaded}/{stats.total_presentations} ({uploadPercent}%)</span>
        </div>
        <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-green-500 rounded-full transition-all"
            style={{ width: `${uploadPercent}%` }}
          />
        </div>
      </div>

      {/* FIX #9: Grouped by room */}
      <div className="space-y-4">
        {stats.rooms.map((room) => {
          const isExpanded = expandedRooms.has(room.room_name);
          const roomPercent = room.total > 0 ? Math.round((room.uploaded / room.total) * 100) : 0;

          return (
            <div key={room.room_name} className="border border-gray-200 rounded-xl overflow-hidden">
              {/* Room header */}
              <button
                onClick={() => toggleRoom(room.room_name)}
                className="w-full flex items-center justify-between px-5 py-4 bg-gray-50 hover:bg-gray-100 transition text-left"
              >
                <div className="flex items-center gap-3">
                  <span className="font-semibold text-gray-800">{room.room_name}</span>
                  {/* FIX #9: x/y count per room */}
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    room.uploaded === room.total && room.total > 0
                      ? "bg-green-100 text-green-700"
                      : "bg-orange-100 text-orange-700"
                  }`}>
                    {room.uploaded}/{room.total} loaded
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500 rounded-full"
                      style={{ width: `${roomPercent}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-400">{isExpanded ? "▲" : "▼"}</span>
                </div>
              </button>

              {/* Room presentations list */}
              {isExpanded && (
                <div className="divide-y divide-gray-100">
                  {room.presentations.length === 0 ? (
                    <p className="text-gray-400 text-sm px-5 py-4">No presentations assigned to this room.</p>
                  ) : (
                    room.presentations.map((p) => (
                      <div key={p.id} className="flex items-center justify-between px-5 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{p.filename}</p>
                          {p.speaker_name && (
                            <p className="text-xs text-gray-400">{p.speaker_name}</p>
                          )}
                        </div>
                        <div className="ml-4 flex items-center gap-3">
                          {p.uploaded ? (
                            <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold">
                              ✓ Loaded
                            </span>
                          ) : (
                            <label className="cursor-pointer">
                              <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200 hover:bg-red-200 transition">
                                {uploadingId === p.id ? "Uploading..." : "Upload"}
                              </span>
                              <input
                                type="file"
                                className="hidden"
                                accept=".ppt,.pptx,.pdf,.key"
                                disabled={uploadingId === p.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleUpload(p.id, p.speaker_id, file);
                                }}
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {stats.rooms.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-lg">No presentations found for this event.</p>
          <p className="text-sm mt-1">Add speakers and sessions to get started.</p>
        </div>
      )}
    </div>
  );
}