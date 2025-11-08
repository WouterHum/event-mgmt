"use client";
import { useEffect, useState } from "react";
import {
  Typography,
  Card,
  CardContent,
  Button,
  LinearProgress,
  MenuItem,
  TextField,
} from "@mui/material";
import { useAuthGuard } from "@/lib/useAuthGuard";
import { apiGet, apiPost } from "@/lib/api";
import { AxiosProgressEvent } from "axios";
import axios from "axios";

interface EventItem {
  id: number;
  title: string;
}
interface SpeakerItem {
  id: number;
  name: string;
}

export default function UploadsPage() {
  const auth = useAuthGuard();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const evts = await apiGet<EventItem[]>("/api/events");
        const spks = await apiGet<SpeakerItem[]>("/api/speakers");
        setEvents(evts);
        setSpeakers(spks);
      } catch (err) {
        console.error("Error loading events/speakers:", err);
      }
    })();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return alert("Choose files");

    const fd = new FormData();
    fd.append("event_id", selectedEvent || "0");
    fd.append("speaker_id", selectedSpeaker || "0");
    fd.append("has_video", "false");
    fd.append("has_audio", "false");
    fd.append("needs_internet", "false");
    Array.from(files).forEach((f) => fd.append("files", f));

    setUploading(true);
    setProgress(0);

    try {
      await apiPost("/api/files/upload", fd, {
        onUploadProgress: (e: AxiosProgressEvent) => {
          const loaded = e.loaded ?? 0;
          const total = e.total ?? 0;
          setProgress(total ? Math.round((loaded * 100) / total) : 0);
        },
      });
      alert("Uploaded");
      setFiles(null);
    } catch (e) {
      console.error("Upload error:", e);
      if (axios.isAxiosError(e)) {
        console.error("Error response:", e.response?.data);
      }
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-2">Uploads</h1>
          <p className="text-muted-foreground">
            Upload files for events and speakers
          </p>
        </header>

        {/* Upload Section */}
        <div className="flex flex-col gap-2 mb-4">
          <label className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 cursor-pointer transition-all">
            + Select Files
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
            />
          </label>

          {files && files.length > 0 && (
            <div className="text-sm text-gray-600">
              Selected files:
              <ul className="list-disc list-inside">
                {Array.from(files).map((file, idx) => (
                  <li key={idx}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="bg-card border border-gray-200 rounded-2xl shadow-sm p-6 space-y-4">
          <TextField
            select
            fullWidth
            label="Select Event"
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
          >
            {events.map((evt) => (
              <MenuItem key={evt.id} value={evt.id}>
                {evt.title}
              </MenuItem>
            ))}
          </TextField>

          <TextField
            select
            fullWidth
            label="Select Speaker"
            value={selectedSpeaker}
            onChange={(e) => setSelectedSpeaker(e.target.value)}
          >
            {speakers.map((spk) => (
              <MenuItem key={spk.id} value={spk.id}>
                {spk.name}
              </MenuItem>
            ))}
          </TextField>

          {uploading && (
            <LinearProgress
              variant="determinate"
              value={progress}
              className="my-2"
            />
          )}

          <div className="flex justify-end">
            <button
              onClick={handleUpload}
              disabled={!files || uploading}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
            >
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
