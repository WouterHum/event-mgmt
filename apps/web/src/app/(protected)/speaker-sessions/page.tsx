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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from "@mui/material";

interface Event {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
}

interface Speaker {
  id: number;
  name: string;
  event_id: number;
}

interface Room {
  id: number;
  name: string;
  event_id: number;
}

interface TechNotes {
  own_pc: boolean;
  video: boolean;
  audio: boolean;
  no_ppt: boolean;
}

interface Session {
  id?: number;
  event_id: number;
  speaker_id: number;
  room_id: number;
  session_date?: string;
  session_time?: string;
  tech_notes?: TechNotes;
  uploaded?: boolean;
  upload_file_path?: string;
  room_name?: string;
  event_name?: string;
}

export default function SpeakerSessionsPage() {
  const searchParams = useSearchParams();
  const eventId = Number(searchParams.get("eventId"));
  const speakerId = Number(searchParams.get("speakerId"));

  const [event, setEvent] = useState<Event | null>(null);
  const [speaker, setSpeaker] = useState<Speaker | null>(null);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<EditState>(null);
  const [uploadingSession, setUploadingSession] = useState<number | null>(null);
  const [attendeeId, setAttendeeId] = useState<number | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  const [form, setForm] = useState<Session>({
    event_id: eventId,
    speaker_id: speakerId,
    room_id: 0,
    session_date: "",
    session_time: "",
    tech_notes: {
      own_pc: false,
      video: false,
      audio: false,
      no_ppt: false,
    },
    uploaded: false,
  });

  type EditState = { id?: number } | null;

  const onEdit = (session: Session) => {
    setEditing({ id: session.id });

    //setAttendeeId(session.attendee_id);
    setEvent(session.event);
    setSpeaker(session.speaker);

    setRoomId(session.room_id);
    setSessionDate(session.session_date);
    setSessionTime(session.session_time);

    setOpen(true);
  };

  const onAddSession = () => {
    console.log("Adding new session");
    setEditing(null);
    setOpen(true);
  };

  useEffect(() => {
    loadData();
  }, [eventId, speakerId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, speakerData, sessionsData, roomsData] =
        await Promise.all([
          apiGet<Event>(`/api/events/${eventId}`),
          apiGet<Speaker>(`/api/speakers/${speakerId}`),
          apiGet<Session[]>(`/api/speakers/${speakerId}/sessions`),
          apiGet<Room[]>(`/api/events/${eventId}/rooms`),
        ]);
      console.log("Rooms loaded:", roomsData); // ADD THIS
      console.log("Rooms count:", roomsData.length); // ADD THI

      setEvent(eventData);
      setSpeaker(speakerData);
      setSessions(sessionsData);
      setRooms(roomsData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddSession = () => {
    setEditing(null);
    setForm({
      event_id: eventId,
      speaker_id: speakerId,
      room_id: rooms.length > 0 ? rooms[0].id : 0,
      session_date: event?.start_time?.split("T")[0] || "",
      session_time: "09:00",
      tech_notes: {
        own_pc: false,
        video: false,
        audio: false,
        no_ppt: false,
      },
      uploaded: false,
    });
    setOpen(true);
  };

  const openEditSession = (session: Session) => {
    setEditing({ id: session.id });

    setForm({
      event_id: session.event_id,
      speaker_id: session.speaker_id,
      room_id: session.room_id,
      session_date: session.session_date ?? "",
      session_time: session.session_time ?? "",
      tech_notes: session.tech_notes ?? {
        own_pc: false,
        video: false,
        audio: false,
        no_ppt: false,
      },
      uploaded: session.uploaded ?? false,
    });

    setOpen(true);
  };

  const saveSession = async () => {
    if (!form.room_id) {
      alert("Please select a room");
      return;
    }

    const data = new FormData(); // ✅ renamed

    data.append("event_id", String(form.event_id));
    data.append("speaker_id", String(form.speaker_id));
    data.append("room_id", String(form.room_id));

    if (form.session_date) data.append("session_date", form.session_date);
    if (form.session_time) data.append("session_time", form.session_time);

    selectedFiles.forEach((file) => {
      data.append("files", file);
    });

    try {
      if (editing?.id) {
        console.log("PUT URL:", `/api/files/uploads/${editing.id}`);
        await apiPut(`/api/files/uploads/${editing.id}`, data);
      } else {
        await apiPost("/api/files/uploads", data);
      }

      setOpen(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error(err);
      alert("Failed to save session");
    }
  };

  const deleteSession = async (id?: number) => {
    if (!id || !confirm("Delete this session?")) return;
    try {
      await apiDelete(`/api/files/uploads/${id}`);
      await loadData();
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  const handleFileUpload = async (sessionId: number, file: File) => {
    try {
      setUploadingSession(sessionId);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`/api/files/uploads/${sessionId}/upload`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) throw new Error("Upload failed");

      await loadData();
      alert("File uploaded successfully!");
    } catch (err) {
      console.error("Failed to upload file:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingSession(null);
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
          href={`/speakers-management?eventId=${eventId}`}
          className="text-blue-600 hover:text-blue-800 font-medium mb-3 inline-block"
        >
          ← Back to Speakers
        </a>

        <div>
          <h1 className="page-title">{speaker?.name}</h1>
          <p className="page-subtitle">{event?.title}</p>
        </div>
      </div>

      {/* Add Session Button */}
      <div className="my-6">
        <button
          onClick={openAddSession}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
        >
          + Add Session
        </button>
      </div>

      {/* Sessions List */}
      <div className="modern-card border border-gray-200 rounded-xl">
        {sessions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            No sessions added yet
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tech Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td>
                      {session.session_date
                        ? new Date(session.session_date).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {session.session_time}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {session.room_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex gap-2 flex-wrap">
                        {session.tech_notes.own_pc && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            Own PC
                          </span>
                        )}
                        {session.tech_notes.video && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            Video
                          </span>
                        )}
                        {session.tech_notes.audio && (
                          <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs">
                            Audio
                          </span>
                        )}
                        {session.tech_notes.no_ppt && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            No PPT
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {session.uploaded ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                          Yes
                        </span>
                      ) : (
                        <label className="cursor-pointer">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200 hover:bg-red-200 transition">
                            {uploadingSession === session.id
                              ? "Uploading..."
                              : "Upload"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".ppt,.pptx,.pdf"
                            disabled={uploadingSession === session.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && session.id) {
                                handleFileUpload(session.id, file);
                              }
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex gap-2">
                        <button
                          onClick={() => openEditSession(session)}
                          className="px-3 py-1.5 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteSession(session.id)}
                          className="px-3 py-1.5 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Session Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        fullWidth
        maxWidth="md"
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
          {editing ? "Edit Session" : "Add Session"}
        </DialogTitle>

        <DialogContent className="space-y-4 py-5">
          <FormControl fullWidth>
            <InputLabel>Room</InputLabel>
            <Select
              value={form.room_id || ""}
              onChange={(e) =>
                setForm({ ...form, room_id: Number(e.target.value) })
              }
              label="Room"
            >
              {rooms.map((room) => (
                <MenuItem key={room.id} value={room.id}>
                  {room.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField
            fullWidth
            type="date"
            label="Session Date"
            value={form.session_date}
            onChange={(e) => setForm({ ...form, session_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          <TextField
            fullWidth
            type="time"
            label="Session Time"
            value={form.session_time}
            onChange={(e) => setForm({ ...form, session_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          <div className="border border-gray-300 rounded-lg p-4">
            <p className="font-semibold text-gray-700 mb-3">Tech Notes</p>
            <FormGroup>
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.tech_notes.own_pc}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tech_notes: {
                          ...form.tech_notes,
                          own_pc: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label="Own PC"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.tech_notes.video}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tech_notes: {
                          ...form.tech_notes,
                          video: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label="Video"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.tech_notes.audio}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tech_notes: {
                          ...form.tech_notes,
                          audio: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label="Audio"
              />
              <FormControlLabel
                control={
                  <Checkbox
                    checked={form.tech_notes.no_ppt}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        tech_notes: {
                          ...form.tech_notes,
                          no_ppt: e.target.checked,
                        },
                      })
                    }
                  />
                }
                label="No PPT"
              />
            </FormGroup>
          </div>
        </DialogContent>

        <DialogActions className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setOpen(false);
              setEditing(null);
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>

          <button
            onClick={() => {
              console.log("BUTTON CLICKED", editing);
              saveSession();
            }}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500"
          >
            {editing?.id ? "Update" : "Add"} Session
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
