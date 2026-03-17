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
  Radio,
  RadioGroup,
  FormControlLabel,
  FormLabel,
  Checkbox,
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
}

interface Room {
  id: number;
  name: string;
}

// FIX #5: Video/Audio are mutually exclusive — use a single field
type MediaOption =
  | "none"
  | "video_with_audio"
  | "video_without_audio"
  | "audio_only";

interface Session {
  id?: number;
  event_id: number;
  speaker_id: number;
  room_id: number;
  session_date?: string;
  session_time?: string; // FIX #6: start time
  session_time_end?: string; // FIX #6: end time
  // FIX #5: single selection for media
  media_option: MediaOption;
  // FIX #4: own_machine and no_ppt are independent checkboxes
  own_machine: boolean;
  no_ppt: boolean;
  uploaded?: boolean;
  upload_file_path?: string | null;
  room_name?: string;
  event_name?: string;
  speaker_name?: string;
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
  const [editing, setEditing] = useState<{ id?: number } | null>(null);
  const [uploadingSessionId, setUploadingSessionId] = useState<number | null>(
    null,
  );

  const emptyForm = (): Session => ({
    event_id: eventId,
    speaker_id: speakerId,
    room_id: 0,
    session_date: "",
    session_time: "", // FIX #6: start time
    session_time_end: "", // FIX #6: end time
    media_option: "none", // FIX #5: default no media selected
    own_machine: false, // FIX #4
    no_ppt: false, // FIX #4
    uploaded: false,
  });

  const [form, setForm] = useState<Session>(emptyForm());

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
          apiGet<Session[]>(
            `/api/speakers/${speakerId}/sessions?event_id=${eventId}`,
          ),
          apiGet<Room[]>(`/api/events/${eventId}/rooms`),
        ]);

      interface RawSession {
        id?: number;
        event_id: number;
        speaker_id: number;
        room_id: number;
        session_date?: string;
        session_time?: string;
        upload_file_path?: string | null;
        uploaded?: boolean;
        tech_notes?: {
          own_machine?: boolean;
          video_with_audio?: boolean;
          video_without_audio?: boolean;
          audio_only?: boolean;
          no_ppt?: boolean;
        };
      }

      const enriched = sessionsData.map((s: RawSession) => ({
        ...s,
        room_name: roomsData.find((r) => r.id === s.room_id)?.name ?? "—",
        event_name: eventData.title,
        // FIX #5: Map API tech_notes back to media_option
        media_option: (s.tech_notes?.video_with_audio
          ? "video_with_audio"
          : s.tech_notes?.video_without_audio
            ? "video_without_audio"
            : s.tech_notes?.audio_only
              ? "audio_only"
              : "none") as MediaOption,
        // FIX #4: own_machine and no_ppt separately
        own_machine: s.tech_notes?.own_machine ?? false,
        no_ppt: s.tech_notes?.no_ppt ?? false,
        session_date: s.session_date || "",
        session_time: s.session_time || "",
        uploaded: s.uploaded ?? false,
        upload_file_path: s.upload_file_path ?? null,
      }));

      setEvent(eventData);
      setSpeaker(speakerData);
      setSessions(enriched);
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
      ...emptyForm(),
      room_id: rooms.length > 0 ? rooms[0].id : 0,
      session_date: event?.start_time?.split("T")[0] || "",
    });
    setOpen(true);
  };

  const openEditSession = (session: Session) => {
    setEditing({ id: session.id });
    setForm({ ...session });
    setOpen(true);
  };

  const saveSession = async () => {
    if (!form.room_id) {
      alert("Please select a room");
      return;
    }
    if (!form.session_date || !form.session_time) {
      alert("Please select date and start time");
      return;
    }

    const payload = {
      event_id: form.event_id,
      speaker_id: form.speaker_id,
      room_id: form.room_id,
      session_date: form.session_date,
      session_time: form.session_time,
      video_with_audio: form.media_option === "video_with_audio",
      video_without_audio: form.media_option === "video_without_audio",
      audio_only: form.media_option === "audio_only",
      own_machine: form.own_machine,
      no_ppt: form.no_ppt,
    };

    console.log("[saveSession] payload:", payload);

    try {
      if (editing?.id) {
        await apiPut(
          `/api/speakers/${speakerId}/sessions/${editing.id}`,
          payload,
        );
      } else {
        // FIX #3: Create session without auto-creating a presentation
        await apiPost(`/api/speakers/${speakerId}/sessions`, payload);
      }
      setOpen(false);
      setEditing(null);
      loadData();
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save session");
    }
  };

  const deleteSession = async (id?: number) => {
    if (!id || !confirm("Delete this session?")) return;
    try {
      await apiDelete(`/api/speakers/${speakerId}/sessions/${id}`);
      await loadData();
    } catch (err) {
      console.error("Failed to delete session:", err);
    }
  };

  // FIX #3: Upload presentation to an existing session
  const handleFileUpload = async (sessionId: number, file: File) => {
    try {
      setUploadingSessionId(sessionId);
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
        },
      );

      if (!response.ok) throw new Error("Upload failed");
      await loadData();
    } catch (err) {
      console.error("Failed to upload file:", err);
      alert("Failed to upload file");
    } finally {
      setUploadingSessionId(null);
    }
  };

  const mediaLabel: Record<MediaOption, string> = {
    none: "—",
    video_with_audio: "Video with Audio",
    video_without_audio: "Video without Audio",
    audio_only: "Audio Only",
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

      <div className="my-6">
        <button
          onClick={openAddSession}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
        >
          + Add Session
        </button>
      </div>

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
                    Time Start
                  </th>
                  {/* FIX #6 */}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Room
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tech Notes
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Presentation
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {session.session_date
                        ? new Date(session.session_date).toLocaleDateString()
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {session.session_time || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800">
                      {session.room_name}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      <div className="flex gap-1 flex-wrap">
                        {session.own_machine && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs">
                            Own Machine
                          </span>
                        )}
                        {session.media_option !== "none" && (
                          <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs">
                            {mediaLabel[session.media_option]}
                          </span>
                        )}
                        {session.no_ppt && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs">
                            No PPT
                          </span>
                        )}
                      </div>
                    </td>
                    {/* FIX #3: Show upload button, or filename if already uploaded */}
                    <td className="px-6 py-4">
                      {session.uploaded && session.upload_file_path ? (
                        <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-semibold border border-green-200">
                          ✓ Uploaded
                        </span>
                      ) : (
                        <label className="cursor-pointer">
                          <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-semibold border border-red-200 hover:bg-red-200 transition">
                            {uploadingSessionId === session.id
                              ? "Uploading..."
                              : "Upload File"}
                          </span>
                          <input
                            type="file"
                            className="hidden"
                            accept=".ppt,.pptx,.pdf,.key"
                            disabled={uploadingSessionId === session.id}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file && session.id)
                                handleFileUpload(session.id, file);
                            }}
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
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
        maxWidth="sm"
        PaperProps={{
          className:
            "bg-white rounded-2xl shadow-2xl border border-gray-200 !m-4",
        }}
      >
        <DialogTitle className="font-semibold text-xl border-b border-gray-200 py-3">
          {editing ? "Edit Session" : "Add Session"}
        </DialogTitle>

        <DialogContent className="space-y-4 py-5">
          {/* Room */}
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

          {/* Date */}
          <TextField
            fullWidth
            type="date"
            label="Session Date"
            value={form.session_date}
            onChange={(e) => setForm({ ...form, session_date: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          {/* FIX #6: Time Start */}
          <TextField
            fullWidth
            type="time"
            label="Time Start"
            value={form.session_time}
            onChange={(e) => setForm({ ...form, session_time: e.target.value })}
            InputLabelProps={{ shrink: true }}
          />

          {/* FIX #6: Time Finish (optional) */}
          <TextField
            fullWidth
            type="time"
            label="Time Finish (optional)"
            value={form.session_time_end || ""}
            onChange={(e) =>
              setForm({ ...form, session_time_end: e.target.value })
            }
            InputLabelProps={{ shrink: true }}
          />

          {/* FIX #3: Presentation upload in the dialog */}
          {editing?.id && (
            <div className="border border-gray-200 rounded-lg p-3">
              <p className="font-semibold text-gray-700 mb-2 text-sm">
                Presentation File
              </p>
              {sessions.find((s) => s.id === editing.id)?.uploaded ? (
                <p className="text-green-600 text-sm">
                  ✓ Presentation uploaded
                </p>
              ) : (
                <label className="flex items-center gap-2 cursor-pointer">
                  <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded text-sm border border-blue-200 hover:bg-blue-200 transition">
                    {uploadingSessionId === editing.id
                      ? "Uploading..."
                      : "Choose Presentation File"}
                  </span>
                  <input
                    type="file"
                    className="hidden"
                    accept=".ppt,.pptx,.pdf,.key"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && editing.id)
                        handleFileUpload(editing.id, file);
                    }}
                  />
                  <span className="text-xs text-gray-400">
                    .pptx, .ppt, .pdf, .key
                  </span>
                </label>
              )}
            </div>
          )}

          <div className="border border-gray-200 rounded-lg p-4 space-y-3">
            <p className="font-semibold text-gray-700">Tech Notes</p>

            {/* FIX #4: Own machine - independent, does NOT affect no_ppt */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.own_machine}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({ ...prev, own_machine: checked }));
                  }}
                />
              }
              label="Using own machine"
            />

            {/* FIX #4: No PPT - independent, does NOT affect own_machine */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={form.no_ppt}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setForm((prev) => ({ ...prev, no_ppt: checked }));
                  }}
                />
              }
              label="No PPT"
            />

            {/* FIX #5: Video/Audio as mutually exclusive radio group */}
            <div>
              <FormLabel
                component="legend"
                className="text-sm text-gray-600 mb-1"
              >
                Media (select one or none)
              </FormLabel>
              <RadioGroup
                value={form.media_option}
                onChange={(e) => {
                  const val = e.target.value as MediaOption;
                  setForm((prev) => ({ ...prev, media_option: val }));
                }}
              >
                <FormControlLabel
                  value="none"
                  control={<Radio size="small" />}
                  label="None"
                />
                <FormControlLabel
                  value="video_with_audio"
                  control={<Radio size="small" />}
                  label="Video with Audio"
                />
                <FormControlLabel
                  value="video_without_audio"
                  control={<Radio size="small" />}
                  label="Video without Audio"
                />
                <FormControlLabel
                  value="audio_only"
                  control={<Radio size="small" />}
                  label="Audio Only"
                />
              </RadioGroup>
            </div>
          </div>
        </DialogContent>

        <DialogActions className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setOpen(false);
              setEditing(null);
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-100 transition"
          >
            Cancel
          </button>
          <button
            onClick={saveSession}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition shadow-sm"
          >
            {editing?.id ? "Update" : "Add"} Session
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
