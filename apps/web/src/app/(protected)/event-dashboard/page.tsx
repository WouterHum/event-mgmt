"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Tabs,
  Tab,
  Box,
} from "@mui/material";

interface Event {
  id: number;
  title: string;
}

interface Room {
  id?: number;
  ip_address?: string;
  name: string;
  capacity?: number | null;
  location?: string;
  status?: string;
  equipment?: string;
  layout?: string;
}

interface RoomStatus {
  room_id: number;
  room_name: string;
  ip_address?: string;
  status: string;
  presentation_count: number;
}

interface Stats {
  total_presentations: number;
  room_breakdown: { [key: string]: number };
}

export default function EventDashboardPage() {
  const searchParams = useSearchParams();
  const eventId = Number(searchParams.get("eventId"));

  const [event, setEvent] = useState<Event | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomStatuses, setRoomStatuses] = useState<RoomStatus[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);

  // Room dialog
  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [roomForm, setRoomForm] = useState<Room>({ name: "" });

  // Upload
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, roomsData, statsData, statusData] = await Promise.all([
        apiGet<Event>(`/api/events/${eventId}`),
        apiGet<Room[]>(`/api/events/${eventId}/rooms`),
        apiGet<Stats>(`/api/events/${eventId}/stats`),
        apiGet<RoomStatus[]>(`/api/events/${eventId}/room-status`),
      ]);
      setEvent(eventData);
      setRooms(roomsData);
      setStats(statsData);
      setRoomStatuses(statusData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddRoom = () => {
    setEditingRoom(null);
    setRoomForm({ name: "" });
    setRoomDialogOpen(true);
  };

  const openEditRoom = (room: Room) => {
    setEditingRoom(room);
    setRoomForm(room);
    setRoomDialogOpen(true);
  };

  const saveRoom = async () => {
    try {
      if (editingRoom && editingRoom.id) {
        await apiPut(`/api/rooms/${editingRoom.id}`, roomForm);
      } else {
        // Don't send event_id since rooms are shared across events
        await apiPost("/api/rooms/", roomForm);
      }
      await loadData();
      setRoomDialogOpen(false);
      setEditingRoom(null);
    } catch (err) {
      console.error("Failed to save room:", err);
      alert("Failed to save room");
    }
  };

  const deleteRoom = async (id?: number) => {
    if (!id || !confirm("Delete this room?")) return;
    try {
      await apiDelete(`/api/rooms/${id}`);
      await loadData();
    } catch (err) {
      console.error("Failed to delete room:", err);
    }
  };

  const handleBulkUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) {
      alert("Please select files to upload");
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      Array.from(uploadFiles).forEach((file) => {
        formData.append("files", file);
      });

      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_BASE}/api/events/${eventId}/upload-bulk`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) throw new Error("Upload failed");

      const result = await response.json();
      alert(`${result.files?.length || 0} files uploaded successfully!`);

      // Redirect to file assignment page
      window.location.href = `/file-assignment?eventId=${eventId}`;
    } catch (err) {
      console.error("Failed to upload files:", err);
      alert("Failed to upload files");
    } finally {
      setUploading(false);
    }
  };

  const handleExportCSV = async () => {
    try {
      const API_BASE =
        process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const response = await fetch(
        `${API_BASE}/api/events/${eventId}/export/csv`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `event_${eventId}_sessions.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export CSV:", err);
      alert("Failed to export CSV");
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <a
          href="/events"
          className="text-blue-600 hover:text-blue-800 font-medium mb-3 inline-block"
        >
          ← Back to Events
        </a>
        <div>
          <h1 className="page-title">{event?.title} - Dashboard</h1>
          <p className="page-subtitle">
            Manage rooms, uploads, and event status
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: "divider", mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(e, newValue) => setActiveTab(newValue)}
        >
          <Tab label="Rooms" />
          <Tab label="Uploads" />
          <Tab label="Exports" />
          <Tab label="Event Status" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      {activeTab === 0 && (
        <div>
          <div className="mb-4">
            <button
              onClick={openAddRoom}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
            >
              + Add Room
            </button>
          </div>

          <div className="modern-card border border-gray-200 rounded-xl">
            {rooms.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No rooms added yet
              </p>
            ) : (
              <ul>
                {rooms.map((room, idx) => (
                  <li
                    key={room.id}
                    className={`flex justify-between items-center py-4 px-6 hover:bg-gray-50 transition ${
                      idx !== rooms.length - 1 ? "border-b border-gray-200" : ""
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-gray-800">{room.name}</p>
                      <p className="text-sm text-gray-500">
                        {room.location && `Location: ${room.location}`}
                        {room.capacity && ` • Capacity: ${room.capacity}`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => openEditRoom(room)}
                        className="px-3 py-1.5 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteRoom(room.id)}
                        className="px-3 py-1.5 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {activeTab === 1 && (
        <div>
          <div className="modern-card border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">
              Bulk Upload Presentations
            </h3>
            <div className="space-y-4">
              <div>
                <input
                  type="file"
                  multiple
                  accept=".ppt,.pptx,.pdf"
                  onChange={(e) => setUploadFiles(e.target.files)}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                {uploadFiles && (
                  <p className="text-sm text-gray-600 mt-2">
                    {uploadFiles.length} file(s) selected
                  </p>
                )}
              </div>
              <button
                onClick={handleBulkUpload}
                disabled={uploading || !uploadFiles}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? "Uploading..." : "Upload Files"}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 2 && (
        <div>
          <div className="modern-card border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Export Session Data</h3>
            <button
              onClick={handleExportCSV}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-teal-600 transition-all shadow-sm"
            >
              📥 Export Sessions as CSV
            </button>
          </div>
        </div>
      )}

      {activeTab === 3 && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="modern-card border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-2">
                Total Presentations
              </h3>
              <p className="text-4xl font-bold text-blue-600">
                {stats?.total_presentations || 0}
              </p>
            </div>

            <div className="modern-card border border-gray-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold mb-4">
                Presentations by Room
              </h3>
              {stats?.room_breakdown &&
              Object.keys(stats.room_breakdown).length > 0 ? (
                <ul className="space-y-2">
                  {Object.entries(stats.room_breakdown).map(([room, count]) => (
                    <li key={room} className="flex justify-between text-sm">
                      <span className="text-gray-700">{room}</span>
                      <span className="font-semibold text-gray-900">
                        {count}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No presentations yet</p>
              )}
            </div>
          </div>

          {/* Room Status */}
          <div className="modern-card border border-gray-200 rounded-xl p-6">
            <h3 className="text-lg font-semibold mb-4">Room PC Status</h3>
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
      )}
      {/* Room Dialog */}
      <Dialog
        open={roomDialogOpen}
        onClose={() => {
          setRoomDialogOpen(false);
          setEditingRoom(null);
        }}
        fullWidth
        maxWidth="sm"
        slotProps={{
          backdrop: {
            className: "backdrop-blur-sm bg-black/30",
          },
        }}
        PaperProps={{
          className:
            "bg-white rounded-2xl shadow-2xl border border-gray-200 !m-4",
        }}
      >
        <DialogTitle className="font-semibold text-xl border-b border-gray-200 py-3">
          {editingRoom ? "Edit Room" : "Add Room"}
        </DialogTitle>

        <DialogContent className="space-y-4 py-5">
          <TextField
            fullWidth
            required
            label="Room Name"
            value={roomForm.name}
            onChange={(e) => setRoomForm({ ...roomForm, name: e.target.value })}
          />

          <TextField
            fullWidth
            label="IP Address"
            value={roomForm.ip_address || ""}
            onChange={(e) =>
              setRoomForm({ ...roomForm, ip_address: e.target.value })
            }
          />

          <TextField
            fullWidth
            label="Capacity"
            type="number"
            value={roomForm.capacity ?? ""}
            onChange={(e) =>
              setRoomForm({
                ...roomForm,
                capacity: e.target.value ? Number(e.target.value) : null,
              })
            }
          />

          <TextField
            fullWidth
            label="Location"
            value={roomForm.location || ""}
            onChange={(e) =>
              setRoomForm({ ...roomForm, location: e.target.value })
            }
          />

          <TextField
            fullWidth
            label="Layout"
            value={roomForm.layout || ""}
            onChange={(e) =>
              setRoomForm({ ...roomForm, layout: e.target.value })
            }
          />

          <TextField
            fullWidth
            label="Equipment"
            value={roomForm.equipment || ""}
            onChange={(e) =>
              setRoomForm({ ...roomForm, equipment: e.target.value })
            }
          />
        </DialogContent>

        <DialogActions className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setRoomDialogOpen(false);
              setEditingRoom(null);
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>

          <button
            onClick={saveRoom}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
          >
            {editingRoom ? "Update" : "Add"} Room
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
