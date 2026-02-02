"use client";

import { useEffect, useState, useCallback } from "react";
import { Room, Presentation } from "@/types";
import { apiGet, apiPut, apiDelete } from "@/lib/api";
import { validateFields } from "@/lib/validation";
import RoomStatusIndicator from "@/app/components/RoomStatusIndicator";
import UploadPresentations from "@/app/components/RoomUploader";

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [pingingRoomId, setPingingRoomId] = useState<number | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [pingSuccessRoomId, setPingSuccessRoomId] = useState<number | null>(
    null,
  );

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiGet<Room[]>("/api/rooms/");
      setRooms(data);
      setLastRefreshed(new Date());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [load]);

  // FIXED: ping then reload full room list
  const pingRoomNow = async (roomId: number) => {
    try {
      setPingingRoomId(roomId);
      await apiPut(`/api/rooms/${roomId}/ping`, {});
      await load();
      setPingSuccessRoomId(roomId);

      setTimeout(() => setPingSuccessRoomId(null), 2000);
    } catch (err) {
      console.error("Ping failed", err);
    } finally {
      setPingingRoomId(null);
    }
  };

  const handleUploaded = async (roomId: number) => {
    await pingRoomNow(roomId);
  };

  const remove = async (id?: number) => {
    if (!id) return;
    await apiDelete(`/api/rooms/${id}`);
    load();
  };

  if (!rooms.length)
    return <div className="p-4 text-center">No rooms found.</div>;

  return (
    <div className="p-4 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Room Dashboard</h1>

      <div className="flex items-center gap-3 mb-4 text-sm text-gray-500">
        {loading ? (
          <>
            <div className="h-3 w-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span>Refreshing rooms…</span>
          </>
        ) : lastRefreshed ? (
          <span>Last refreshed at {lastRefreshed.toLocaleTimeString()}</span>
        ) : null}
      </div>

      <button
        onClick={() => {
          setEditingRoom({
            name: "",
            capacity: undefined,
            location: "",
            layout: "",
            equipment: "",
            ip_address: "",
          });
          setIsModalOpen(true);
        }}
        className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
      >
        + Add Room
      </button>

      <div className="space-y-4 mt-4">
        {rooms.map((r) => (
          <div
            key={r.id}
            className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition"
          >
            <div className="flex-1">
              <h3 className="text-lg font-semibold">{r.name}</h3>

              <RoomStatusIndicator status={r.status} />

              {pingSuccessRoomId === r.id && (
                <span className="text-xs text-green-600 font-medium">
                  ✓ Ping successful
                </span>
              )}

              <p className="text-sm text-gray-500 mt-1">
                Capacity: {r.capacity ?? "N/A"}
              </p>

              {r.location && (
                <p className="text-sm text-gray-500">Location: {r.location}</p>
              )}

              {r.layout && (
                <p className="text-sm text-gray-500">Layout: {r.layout}</p>
              )}

              {r.equipment && (
                <p className="text-sm text-gray-500">
                  Equipment: {r.equipment}
                </p>
              )}

              {/* ✅ FIXED CONDITION */}
              {r.ip_address && (
                <p className="text-sm text-gray-500">
                  IP Address: {r.ip_address}
                </p>
              )}

              {/* Presentations */}
              {r.presentations && r.presentations.length > 0 ? (
                <ul className="mt-2 text-sm max-h-32 overflow-y-auto border p-2 rounded space-y-1">
                  {r.presentations.map((p: Presentation) => (
                    <li
                      key={p.id}
                      className="flex items-center gap-2 truncate"
                      title={p.fileName}
                    >
                      <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                      <span className="truncate">{p.fileName}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-400 mt-2">
                  No presentations loaded
                </p>
              )}
            </div>

            <div className="flex flex-col gap-2 mt-4 md:mt-0 md:ml-4">
              <UploadPresentations
                roomId={r.id!}
                onUploaded={() => handleUploaded(r.id!)}
              />

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

              <button
                onClick={() => remove(r.id)}
                className="bg-red-50 text-red-600 px-3 py-1 rounded text-sm hover:bg-red-100 transition"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && editingRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingRoom.id ? "Edit Room" : "Add Room"}
            </h2>

            {[
              { key: "name", label: "Room Name", required: true },
              { key: "ip_address", label: "IP Address" },
              { key: "capacity", label: "Capacity", type: "number" },
              { key: "location", label: "Location" },
              { key: "layout", label: "Layout" },
              { key: "equipment", label: "Equipment" },
            ].map((f) => (
              <input
                key={f.key}
                type={f.type || "text"}
                placeholder={f.label}
                value={(editingRoom as any)[f.key] ?? ""}
                onChange={(e) =>
                  setEditingRoom({
                    ...editingRoom,
                    [f.key]:
                      f.type === "number"
                        ? Number(e.target.value)
                        : e.target.value,
                  })
                }
                className="w-full border rounded px-3 py-2 mb-2"
              />
            ))}

            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 rounded bg-gray-100"
              >
                Cancel
              </button>

              <button
                onClick={async () => {
                  if (!validateFields(editingRoom, ["name"])) return;

                  if (editingRoom.id) {
                    await apiPut(`/api/rooms/${editingRoom.id}`, editingRoom);
                  } else {
                    await apiPut("/api/rooms", editingRoom);
                  }

                  setIsModalOpen(false);
                  setEditingRoom(null);
                  load();
                }}
                className="px-4 py-1 rounded bg-blue-600 text-white"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
