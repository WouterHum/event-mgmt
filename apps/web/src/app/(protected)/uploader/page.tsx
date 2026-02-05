"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  MenuItem,
  LinearProgress,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { apiGet, apiPost } from "@/lib/api";

// --- Types ---
interface EventItem {
  id: number;
  title: string;
  start_time: string;
  end_time: string;
}

interface SpeakerItem {
  id: number;
  name: string | null;
  email: string | null;
}

interface Room {
  id: number;
  name: string;
  event_id: number;
}

interface SessionItem {
  id: number;
  title?: string | null;
  room_id?: number;
  room_name?: string;
  session_date?: string;
  session_time?: string;
  uploaded?: boolean;
  tech_notes?: {
    own_pc: boolean;
    video: boolean;
    audio: boolean;
    no_ppt: boolean;
  };
}

export default function EventUploaderPage() {
  // --- State ---
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);

  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [speakerQuery, setSpeakerQuery] = useState("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<SpeakerItem | null>(
    null,
  );

  const [sessions, setSessions] = useState<SessionItem[]>([]);
  const [selectedSession, setSelectedSession] = useState<SessionItem | null>(
    null,
  );

  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const [techNotes, setTechNotes] = useState({
    has_video: false,
    has_audio: false,
    needs_internet: false,
  });

  // --- Load events on mount ---
  useEffect(() => {
    (async () => {
      try {
        const evts = await apiGet<EventItem[]>("/api/events");
        setEvents(evts);
      } catch (err) {
        console.error("Failed to load events:", err);
      }
    })();
  }, []);

  // --- Search speakers client-side ---
  const searchSpeakers = async () => {
    if (!speakerQuery.trim() || !selectedEvent) return;

    try {
      const allSpeakers = await apiGet<SpeakerItem[]>("/api/speakers/");
      const filtered = allSpeakers.filter(
        (s) =>
          (s.name ?? "").toLowerCase().includes(speakerQuery.toLowerCase()) ||
          (s.email ?? "").toLowerCase().includes(speakerQuery.toLowerCase()),
      );
      setSpeakers(filtered);
    } catch (err) {
      console.error("Speaker search failed:", err);
    }
  };

  // --- Select speaker and load sessions ---
  const selectSpeaker = async (speaker: SpeakerItem) => {
    setSelectedSpeaker(speaker);
    setSelectedSession(null);
    setFiles(null);
    setProgress(0);
    setUploading(false);

    if (!speaker.id || !selectedEvent?.id) return;

    try {
      // Load sessions + rooms
      const [sessionsData, roomsData] = await Promise.all([
        apiGet<SessionItem[]>(`/api/speakers/${speaker.id}/sessions`),
        apiGet<Room[]>(`/api/events/${selectedEvent.id}/rooms`),
      ]);

      // Map room names and default values
      const sessionsWithExtras = sessionsData.map((s) => ({
        ...s,
        room_name: roomsData.find((r) => r.id === s.room_id)?.name ?? "—",
        session_date: s.session_date || "—",
        session_time: s.session_time || "—",
        tech_notes: s.tech_notes ?? {
          own_pc: false,
          video: false,
          audio: false,
          no_ppt: false,
        },
        uploaded: s.uploaded ?? false,
      }));

      setSessions(sessionsWithExtras);
    } catch (err) {
      console.error("Failed to load speaker sessions:", err);
      setSessions([]);
    }
  };

  // --- File select ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  // --- Upload files ---
  const handleUpload = async () => {
    if (!files || !selectedSession) {
      alert("Please select a session and files");
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("file", file));

    try {
      setUploading(true);
      setProgress(0);

      await apiPost(`/api/files/${selectedSession.id}/upload`, formData, {
        onUploadProgress: (e: ProgressEvent) => {
          if (e.total) {
            setProgress(Math.round((e.loaded * 100) / e.total));
          }
        },
      });

      alert("Files uploaded!");
      // Refresh sessions to reflect uploaded status
      if (selectedSpeaker?.id) {
        selectSpeaker(selectedSpeaker);
      }
      setFiles(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    } finally {
      setUploading(false);
      setProgress(0);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-5xl mx-auto px-4 space-y-8">
        {/* Event selection */}
        <Card>
          <CardContent>
            <Typography variant="h6">Select Event</Typography>
            <TextField
              select
              fullWidth
              value={selectedEvent?.id ?? ""}
              onChange={(e) => {
                const evt = events.find(
                  (ev) => ev.id === Number(e.target.value),
                );
                setSelectedEvent(evt ?? null);
                setSelectedSpeaker(null);
                setSessions([]);
              }}
            >
              {events.map((ev) => (
                <MenuItem key={ev.id} value={ev.id}>
                  {ev.title}
                </MenuItem>
              ))}
            </TextField>
          </CardContent>
        </Card>

        {/* Speaker search */}
        {selectedEvent && (
          <Card>
            <CardContent className="space-y-4">
              <Typography variant="h6">Search Speaker</Typography>
              <div className="flex gap-2">
                <TextField
                  fullWidth
                  label="Name or Email"
                  value={speakerQuery}
                  onChange={(e) => setSpeakerQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && searchSpeakers()}
                />
                <Button variant="contained" onClick={searchSpeakers}>
                  Search
                </Button>
              </div>
              {/* Results */}
              {speakers.length > 0 && (
                <div className="border rounded mt-2">
                  {speakers.map((s) => (
                    <div
                      key={s.id}
                      className="p-2 cursor-pointer hover:bg-gray-100"
                      onClick={() => selectSpeaker(s)}
                    >
                      {s.name ?? "Unnamed"} ({s.email ?? "No email"})
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Speaker sessions */}
        {selectedSpeaker && (
          <Card>
            <CardContent className="space-y-4">
              <Typography variant="h6">
                Sessions for {selectedSpeaker.name ?? "Unknown"}
              </Typography>
              {sessions.length > 0 ? (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <Card
                      key={s.id}
                      className={`p-3 cursor-pointer border ${
                        selectedSession?.id === s.id
                          ? "border-primary"
                          : "border-gray-200"
                      }`}
                      onClick={() => setSelectedSession(s)}
                    >
                      <div>
                        <strong>{s.title ?? "Untitled Session"}</strong>
                      </div>
                      <div>Room: {s.room_name}</div>
                      <div>Date: {s.session_date}</div>
                      <div>Time: {s.session_time}</div>
                      <div>
                        Uploaded:{" "}
                        <span
                          className={
                            s.uploaded ? "text-green-600" : "text-red-600"
                          }
                        >
                          {s.uploaded ? "Yes" : "No"}
                        </span>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-gray-500">No sessions found</div>
              )}
            </CardContent>
          </Card>
        )}

        {/* File uploader + tech notes */}
        {selectedSession && (
          <Card>
            <CardContent className="space-y-4">
              <Typography variant="h6">Upload Files for Session</Typography>
              <label className="inline-flex items-center justify-center rounded-md bg-primary text-white px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 cursor-pointer">
                Select Files
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              {files && files.length > 0 && (
                <ul className="list-disc list-inside">
                  {Array.from(files).map((f, i) => (
                    <li key={i}>{f.name}</li>
                  ))}
                </ul>
              )}
              {uploading && (
                <LinearProgress variant="determinate" value={progress} />
              )}
              <Button
                variant="contained"
                onClick={handleUpload}
                disabled={!files || uploading}
              >
                {uploading ? "Uploading..." : "Upload"}
              </Button>

              {/* Tech Notes */}
              <div className="mt-4 space-y-1">
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={techNotes.has_video}
                      onChange={(e) =>
                        setTechNotes({
                          ...techNotes,
                          has_video: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Contains video"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={techNotes.has_audio}
                      onChange={(e) =>
                        setTechNotes({
                          ...techNotes,
                          has_audio: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Contains audio"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={techNotes.needs_internet}
                      onChange={(e) =>
                        setTechNotes({
                          ...techNotes,
                          needs_internet: e.target.checked,
                        })
                      }
                    />
                  }
                  label="Requires Internet"
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
