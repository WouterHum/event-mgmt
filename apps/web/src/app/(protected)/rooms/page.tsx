"use client";

import { useEffect, useState, useCallback } from "react";
import { Room } from "@/types";
import { apiGet, apiPut, apiPost, apiDelete } from "@/lib/api";
import { validateFields } from "@/lib/validation";
import RoomStatusIndicator from "@/app/components/RoomStatusIndicator";
import { useAtom } from "jotai";
import { authAtom } from "@/atoms/authAtom";
import { useSearchParams } from "next/navigation";

interface RoomSession {
  id?: number;
  session_name: string;
  start_time: string;
  end_time: string;
  speaker_id?: number;
  speaker_name?: string;
  room_id: number;
}

interface Speaker {
  id: number;
  name: string;
}

export default function RoomsPage() {
  const [auth] = useAtom(authAtom);
  const searchParams = useSearchParams();
  // FIX #1: get eventId from URL
  const eventId = searchParams.get("eventId")
    ? Number(searchParams.get("eventId"))
    : null;

  const [rooms, setRooms] = useState<Room[]>([]);
  const [allRooms, setAllRooms] = useState<Room[]>([]); // For assigning to event
  const [pingingRoomId, setPingingRoomId] = useState<number | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pingResult, setPingResult] = useState<{
    roomId: number;
    online: boolean;
  } | null>(null);

  // FIX #2: Session management
  const [sessionModalOpen, setSessionModalOpen] = useState(false);
  const [selectedRoomForSession, setSelectedRoomForSession] =
    useState<Room | null>(null);
  const [roomSessions, setRoomSessions] = useState<RoomSession[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessionForm, setSessionForm] = useState<RoomSession>({
    session_name: "",
    start_time: "",
    end_time: "",
    room_id: 0,
  });
  const [editingSession, setEditingSession] = useState<{ id?: number } | null>(
    null,
  );

  // FIX #1: Show assign-room panel
  const [showAssignPanel, setShowAssignPanel] = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      let data: Room[];
      // FIX #1: Load only rooms for this event
      if (eventId) {
        data = await apiGet<Room[]>(`/api/events/${eventId}/rooms`);
      } else {
        data = await apiGet<Room[]>("/api/rooms/");
      }
      setRooms(data);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    load();
    if (eventId) {
      // Load speakers for this event for session assignment
      apiGet<Speaker[]>(`/api/events/${eventId}/speakers`)
        .then(setSpeakers)
        .catch(() => {});
    }
  }, [load, eventId]);

  const pingRoomNow = async (roomId: number) => {
    try {
      setPingingRoomId(roomId);
      const result = await apiPut<
        object,
        { is_online: boolean; status: string }
      >(`/api/rooms/${roomId}/ping`, {});
      await load();
      setPingResult({ roomId, online: result.is_online });
      setTimeout(() => setPingResult(null), 3000);
    } catch (err) {
      console.error("Ping failed", err);
      setPingResult({ roomId, online: false });
      setTimeout(() => setPingResult(null), 3000);
    } finally {
      setPingingRoomId(null);
    }
  };

  const remove = async (id?: number) => {
    if (!id) return;
    if (eventId) {
      // FIX #1: Remove from event, not delete globally
      await apiDelete(`/api/events/${eventId}/rooms/${id}`);
    } else {
      await apiDelete(`/api/rooms/${id}`);
    }
    load();
  };

  // FIX #1: Add a room globally, then assign to event
  const [saveError, setSaveError] = useState<string | null>(null);

  const saveRoom = async () => {
    if (!editingRoom) return;
    setSaveError(null);

    // Validate required fields
    if (!editingRoom.name?.trim()) {
      setSaveError("Room Name is required.");
      return;
    }
    if (!editingRoom.capacity || editingRoom.capacity < 1) {
      setSaveError("Capacity is required and must be at least 1.");
      return;
    }

    try {
      if (editingRoom.id) {
        await apiPut(`/api/rooms/${editingRoom.id}`, editingRoom);
      } else {
        const created = await apiPost<Partial<Room>, Room>(
          "/api/rooms",
          editingRoom,
        );
        if (eventId && created.id) {
          await apiPost(`/api/events/${eventId}/rooms/${created.id}`, {});
        }
      }
      setIsModalOpen(false);
      setEditingRoom(null);
      load();
    } catch (err: unknown) {
      if (err && typeof err === "object" && "response" in err) {
        const axiosErr = err as { response?: { data?: { detail?: string } } };
        setSaveError(axiosErr.response?.data?.detail ?? "Failed to save room");
      } else {
        setSaveError(
          err instanceof Error ? err.message : "Failed to save room",
        );
      }
    }
  };

  // FIX #2: Load sessions for a room
  const openSessionsForRoom = async (room: Room) => {
    setSelectedRoomForSession(room);
    if (eventId) {
      try {
        const sessions = await apiGet<RoomSession[]>(
          `/api/events/${eventId}/room-sessions?room_id=${room.id}`,
        );
        setRoomSessions(sessions);
      } catch {
        setRoomSessions([]);
      }
    }
    setSessionForm({
      session_name: "",
      start_time: "",
      end_time: "",
      room_id: room.id!,
    });
    setEditingSession(null);
    setSessionModalOpen(true);
  };

  const saveSession = async () => {
    if (!sessionForm.session_name) {
      alert("Session name is required");
      return;
    }
    if (!sessionForm.start_time || !sessionForm.end_time) {
      alert("Start and end time are required");
      return;
    }
    if (!eventId) return;

    const payload = {
      ...sessionForm,
      room_id: selectedRoomForSession?.id,
    };

    if (editingSession?.id) {
      await apiPut(
        `/api/events/${eventId}/room-sessions/${editingSession.id}`,
        payload,
      );
    } else {
      await apiPost(`/api/events/${eventId}/room-sessions`, payload);
    }

    const sessions = await apiGet<RoomSession[]>(
      `/api/events/${eventId}/room-sessions?room_id=${selectedRoomForSession?.id}`,
    );
    setRoomSessions(sessions);
    setSessionForm({
      session_name: "",
      start_time: "",
      end_time: "",
      room_id: selectedRoomForSession?.id ?? 0,
    });
    setEditingSession(null);
  };

  const deleteSession = async (sessionId: number) => {
    if (!confirm("Delete this session?") || !eventId) return;
    await apiDelete(`/api/events/${eventId}/room-sessions/${sessionId}`);
    const sessions = await apiGet<RoomSession[]>(
      `/api/events/${eventId}/room-sessions?room_id=${selectedRoomForSession?.id}`,
    );
    setRoomSessions(sessions);
  };

  const emptyRoom = {
    name: "",
    capacity: undefined,
    location: "",
    layout: "",
    equipment: "",
    ip_address: "",
    status: "offline" as const,
  };

  const openAddRoom = () => {
    setEditingRoom(emptyRoom);
    setIsModalOpen(true);
  };

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Rooms</h1>
        <div className="flex gap-2">
          <button
            onClick={openAddRoom}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            + Add Room
          </button>
        </div>
      </div>

      {loading && (
        <div className="text-sm text-gray-400 mb-3">Loading rooms...</div>
      )}

      {!loading && rooms.length === 0 && (
        <div className="text-center py-12 text-gray-400 border border-dashed border-gray-300 rounded-lg">
          <p className="text-lg mb-2">No rooms assigned to this event yet.</p>
          <p className="text-sm">
            Click <strong>+ Add Room</strong> to get started.
          </p>
        </div>
      )}

      <div className="space-y-4">
        {rooms.map((r) => (
          <div
            key={r.id}
            className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{r.name}</h3>
              <RoomStatusIndicator status={r.status} />
              {pingResult?.roomId === r.id &&
                pingResult !== null &&
                (pingResult.online ? (
                  <span className="text-xs text-green-600 font-medium">
                    ✓ Online
                  </span>
                ) : (
                  <span className="text-xs text-red-500 font-medium">
                    ✗ Unreachable
                  </span>
                ))}
              <p className="text-sm text-gray-500 mt-1">
                Capacity: {r.capacity ?? "N/A"}
              </p>
              {r.location && (
                <p className="text-sm text-gray-500">Location: {r.location}</p>
              )}
              {r.ip_address && (
                <p className="text-sm text-gray-500">IP: {r.ip_address}</p>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-4">
              {/* FIX #2: Button to manage sessions for this room */}
              {eventId && (
                <button
                  onClick={() => openSessionsForRoom(r)}
                  className="bg-purple-600 text-white px-3 py-1 rounded text-sm hover:bg-purple-700 transition"
                >
                  Sessions
                </button>
              )}
              <button
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition"
                onClick={() => pingRoomNow(r.id!)}
                disabled={pingingRoomId === r.id}
              >
                {pingingRoomId === r.id ? "Pinging..." : "Ping"}
              </button>
              <button
                onClick={() => {
                  setEditingRoom(r);
                  setIsModalOpen(true);
                }}
                className="bg-gray-100 text-gray-700 px-3 py-1 rounded text-sm hover:bg-gray-200"
              >
                Edit
              </button>
              {auth.role === "admin" && (
                <button
                  onClick={() => remove(r.id)}
                  className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-100 transition"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Room Add/Edit Modal */}
      {isModalOpen && editingRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingRoom.id ? "Edit Room" : "Add Room"}
            </h2>

            {saveError && (
              <div className="mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                {saveError}
              </div>
            )}

            {[
              { key: "name", label: "Room Name", required: true, type: "text" },
              {
                key: "capacity",
                label: "Capacity",
                required: true,
                type: "number",
              },
              {
                key: "ip_address",
                label: "IP Address",
                required: false,
                type: "text",
              },
              {
                key: "location",
                label: "Location",
                required: false,
                type: "text",
              },
              { key: "layout", label: "Layout", required: false, type: "text" },
              {
                key: "equipment",
                label: "Equipment",
                required: false,
                type: "text",
              },
            ].map((f) => {
              const val =
                (
                  editingRoom as unknown as Record<
                    string,
                    string | number | undefined
                  >
                )[f.key] ?? "";
              const isEmpty =
                f.required && (val === "" || val === 0 || val === undefined);
              return (
                <div key={f.key} className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {f.label}
                    {f.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <input
                    type={f.type}
                    placeholder={f.label}
                    value={val}
                    min={f.type === "number" ? 1 : undefined}
                    onChange={(e) =>
                      setEditingRoom({
                        ...editingRoom,
                        [f.key]:
                          f.type === "number"
                            ? Number(e.target.value)
                            : e.target.value,
                      })
                    }
                    className={`w-full border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 ${
                      isEmpty ? "border-red-400 bg-red-50" : "border-gray-300"
                    }`}
                  />
                  {isEmpty && (
                    <p className="text-red-500 text-xs mt-1">
                      {f.label} is required
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => {
                  setIsModalOpen(false);
                  setSaveError(null);
                }}
                className="px-3 py-2 rounded bg-gray-100 hover:bg-gray-200 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveRoom}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FIX #2: Sessions Modal */}
      {sessionModalOpen && selectedRoomForSession && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-semibold">
                Sessions — {selectedRoomForSession.name}
              </h2>
              <button
                onClick={() => setSessionModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                &times;
              </button>
            </div>

            {/* Existing sessions */}
            {roomSessions.length > 0 ? (
              <div className="mb-4 border rounded overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left">Session Name</th>
                      <th className="px-3 py-2 text-left">Start</th>
                      <th className="px-3 py-2 text-left">End</th>
                      <th className="px-3 py-2 text-left">Speaker</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {roomSessions.map((s) => (
                      <tr key={s.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">{s.session_name}</td>
                        <td className="px-3 py-2">
                          {s.start_time
                            ? new Date(s.start_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2">
                          {s.end_time
                            ? new Date(s.end_time).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="px-3 py-2">{s.speaker_name || "—"}</td>
                        <td className="px-3 py-2">
                          <button
                            onClick={() => {
                              setEditingSession({ id: s.id });
                              setSessionForm({
                                ...s,
                                room_id: selectedRoomForSession.id!,
                              });
                            }}
                            className="text-blue-600 hover:underline text-xs mr-2"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => s.id && deleteSession(s.id)}
                            className="text-red-600 hover:underline text-xs"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-400 text-sm mb-4">
                No sessions yet for this room.
              </p>
            )}

            {/* Add/Edit session form */}
            <div className="border rounded p-4 space-y-3 bg-gray-50">
              <h3 className="font-medium text-gray-700">
                {editingSession?.id ? "Edit Session" : "Add Session"}
              </h3>
              <input
                type="text"
                placeholder="Session Name *"
                value={sessionForm.session_name}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    session_name: e.target.value,
                  })
                }
                className="w-full border rounded px-3 py-2"
              />
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionForm.start_time}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        start_time: e.target.value,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    value={sessionForm.end_time}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        end_time: e.target.value,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  />
                </div>
              </div>
              {speakers.length > 0 && (
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    Speaker (optional)
                  </label>
                  <select
                    value={sessionForm.speaker_id ?? ""}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        speaker_id: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      })
                    }
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">— No speaker assigned —</option>
                    {speakers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                {editingSession && (
                  <button
                    onClick={() => {
                      setEditingSession(null);
                      setSessionForm({
                        session_name: "",
                        start_time: "",
                        end_time: "",
                        room_id: selectedRoomForSession.id!,
                      });
                    }}
                    className="px-3 py-1.5 rounded border border-gray-300 text-sm"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  onClick={saveSession}
                  className="px-4 py-1.5 rounded bg-purple-600 text-white text-sm hover:bg-purple-700"
                >
                  {editingSession?.id ? "Update Session" : "Add Session"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
