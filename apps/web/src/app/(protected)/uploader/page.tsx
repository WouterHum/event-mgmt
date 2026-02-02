"use client";
import { useEffect, useState } from "react";
import {
  LinearProgress,
  MenuItem,
  TextField,
  Card,
  CardContent,
  Typography,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import axios, { AxiosProgressEvent } from "axios";

// Interfaces
interface EventItem {
  id: number;
  title: string;
}
interface SpeakerItem {
  id: number;
  name: string;
}
interface DelegateItem {
  id: number;
  name: string;
}

export default function UploadsPage() {
  // --- Existing uploader states ---
  const [events, setEvents] = useState<EventItem[]>([]);
  const [speakers, setSpeakers] = useState<SpeakerItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<string>("");
  const [selectedSpeaker, setSelectedSpeaker] = useState<string>("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [progress, setProgress] = useState<number>(0);
  const [uploading, setUploading] = useState<boolean>(false);

  // --- New dashboard states ---
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DelegateItem[]>([]);
  const [selectedDelegate, setSelectedDelegate] = useState<any | null>(null);
  const [tech, setTech] = useState({
    has_video: false,
    has_audio: false,
    needs_internet: false,
  });

  // Load events + speakers (existing logic)
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

  // The type returned from the API
  interface UploadItem {
    id: number;
    event_id: number;
    speaker_id: number;
    attendee_id?: number;
    filename: string;
    size_bytes: number;
    has_video: boolean;
    has_audio: boolean;
    needs_internet: boolean;
    etag?: string;
    updated_at?: string;
  }

  interface TechNotes {
    has_video: boolean;
    has_audio: boolean;
    needs_internet: boolean;
  }

  // The type we send when creating a new upload
  interface UploadCreateDTO {
    attendee_id: number;
    event_id: number;
    speaker_id: number;
    filename: string;
    size_bytes: number;
    has_video: boolean;
    has_audio: boolean;
    needs_internet: boolean;
  }

  interface DelegateDetails {
    delegate: {
      id: number;
      name: string;
      email: string;
    };
    session: {
      title: string | null;
      venue: string | null;
      time: string | null;
    };
    uploads: UploadItem[];
  }

  // File select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  // Upload logic (unchanged)
  // inside your UploadsPage component

  const handleUpload = async (
    files: File[],
    attendee_id: number,
    event_id: number,
    speaker_id: number
  ) => {
    try {
      const formData = new FormData();
      formData.append("attendee_id", attendee_id.toString());
      formData.append("event_id", event_id.toString());
      formData.append("speaker_id", speaker_id.toString());
      formData.append("has_video", "true"); // or your dynamic value
      formData.append("has_audio", "true");
      formData.append("needs_internet", "true");

      files.forEach((file) => formData.append("files", file));

      // Log all FormData entries
      console.log("[Upload] FormData entries:");
      formData.forEach((value, key) => console.log(key, value));

      // Log environment variable
      console.log(
        "[Env] NEXT_PUBLIC_API_URL:",
        process.env.NEXT_PUBLIC_API_URL
      );

      // Determine the target URL
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const targetUrl = `${baseUrl}/api/files/uploads`;
      console.log("[Upload] Sending to URL:", targetUrl);

      // If using Axios
      const res = await axios.post(targetUrl, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      console.log("[Upload] Response status:", res.status);
      console.log("[Upload] Response data:", res.data);

      return res.data;
    } catch (err: unknown) {
      console.error("[Upload] Error:", err);
      if (err instanceof Error) {
        throw new Error(err.message);
      } else {
        throw new Error("Unknown error during upload");
      }
    }
  };

  // --- NEW: Search delegates ---
  const searchDelegates = async () => {
    if (!query.trim()) return;
    const res = await apiGet(`/api/attendees/search?q=${query}`);
    setResults(res);
  };

  // --- NEW: Select delegate + load full details ---

  const selectDelegate = async (d: DelegateItem) => {
    console.log("Selecting delegate:", d);

    const details = await apiGet<DelegateDetails>(`/api/attendees/${d.id}`);
    console.log("Loaded delegate details:", details);

    setSelectedDelegate(details);

    if (details.uploads?.length > 0) {
      console.log("Uploads found:", details.uploads);
      const u = details.uploads[0];

      setTech({
        has_video: u.has_video,
        has_audio: u.has_audio,
        needs_internet: u.needs_internet,
      });
    } else {
      console.warn("NO uploads returned for this delegate");
      setTech({
        has_video: false,
        has_audio: false,
        needs_internet: false,
      });
    }
  };

  // --- NEW: Save tech notes only ---
  const saveTechNotes = async () => {
    if (!selectedDelegate?.uploads?.length)
      return alert("No upload record found.");
    const uploadId = selectedDelegate.uploads[0].id;

    const baseUrl = process.env.NEXT_PUBLIC_API_URL;
    const url = `${baseUrl}/api/files/uploads/${uploadId}/tech-notes`;
    console.log("[TechNotes] PUT URL:", url);

    try {
      const res = await axios.put(url, tech);
      console.log("Tech notes save response:", res.data);
      if (res.data.status === "ok") alert("Technical notes updated!");
    } catch (err) {
      console.error("Tech notes save error:", err);
      alert("Failed to save technical notes");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-5xl mx-auto px-4">
        {/* -------------------------------------- */}
        {/* HEADER */}
        {/* -------------------------------------- */}
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-1">Uploads</h1>
          <p className="text-muted-foreground">
            Upload files and manage delegate details
          </p>
        </header>

        {/* -------------------------------------- */}
        {/* FILE UPLOADER (existing functionality) */}
        {/* -------------------------------------- */}
        <Card className="mb-10">
          <CardContent className="space-y-6">
            <Typography variant="h6">Upload Files</Typography>

            {/* Select files */}
            <label className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 cursor-pointer">
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
                Files:
                <ul className="list-disc list-inside">
                  {Array.from(files).map((f, i) => (
                    <li key={i}>{f.name}</li>
                  ))}
                </ul>
              </div>
            )}

            <TextField
              select
              label="Event"
              fullWidth
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
              label="Speaker"
              fullWidth
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
              <LinearProgress variant="determinate" value={progress} />
            )}

            <Button
              variant="contained"
              disabled={
                !files ||
                !selectedDelegate ||
                !selectedEvent ||
                !selectedSpeaker ||
                uploading
              }
              onClick={async () => {
                if (
                  !files ||
                  !selectedDelegate ||
                  !selectedEvent ||
                  !selectedSpeaker
                )
                  return;

                setUploading(true);
                setProgress(0);

                try {
                  console.log("[Upload] Starting upload...");

                  const uploaded = await handleUpload(
                    Array.from(files),
                    selectedDelegate.delegate.id,
                    Number(selectedEvent),
                    Number(selectedSpeaker)
                  );

                  console.log("[Upload] Finished uploading:", uploaded);

                  // Option 1: Refresh delegate from backend
                  const refreshedDelegate = await apiGet<DelegateDetails>(
                    `/api/attendees/${selectedDelegate.delegate.id}`
                  );
                  console.log(
                    "[Upload] Refreshed delegate details:",
                    refreshedDelegate
                  );
                  setSelectedDelegate(refreshedDelegate);

                  // Option 2: Optimistic update (optional instead of refresh)
                  /*
      setSelectedDelegate((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          uploads: [
            ...(prev.uploads || []),
            ...uploaded.uploaded.map((f: any) => ({
              id: f.id,
              filename: f.filename,
              size_bytes: f.size_bytes,
              has_video: true,
              has_audio: true,
              needs_internet: true,
            })),
          ],
        };
      });
      */

                  alert("Upload successful!");
                } catch (err) {
                  console.error("[Upload] Upload failed:", err);
                  alert("Upload failed. See console for details.");
                } finally {
                  setUploading(false);
                }
              }}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </CardContent>
        </Card>

        {/* -------------------------------------- */}
        {/* NEW FEATURE: Delegate Search Dashboard */}
        {/* -------------------------------------- */}
        <Card>
          <CardContent className="space-y-6">
            <Typography variant="h6">Delegate Search</Typography>

            {/* Search bar */}
            <div className="flex gap-3">
              <TextField
                label="Search delegate"
                fullWidth
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              <Button variant="contained" onClick={searchDelegates}>
                Search
              </Button>
            </div>

            {/* Search results */}
            {results.length > 0 && (
              <Card className="border rounded p-3">
                {results.map((d) => (
                  <div
                    key={d.id}
                    onClick={() => selectDelegate(d)}
                    className="p-2 border-b cursor-pointer hover:bg-gray-100"
                  >
                    {d.name}
                  </div>
                ))}
              </Card>
            )}

            {/* Delegate details */}
            {selectedDelegate && (
              <Card className="p-4 border">
                <Typography variant="h6">
                  {selectedDelegate.delegate.name}
                </Typography>

                <div>Session: {selectedDelegate.session.title}</div>
                <div>Venue: {selectedDelegate.session.venue}</div>
                <div>Time: {selectedDelegate.session.time}</div>

                <div className="mt-4">
                  Upload status:{" "}
                  <strong>
                    {selectedDelegate.uploads.length > 0
                      ? "Uploaded"
                      : "Not uploaded"}
                  </strong>
                </div>

                {/* Tech notes */}
                <div className="mt-3 space-y-1">
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tech.has_video}
                        onChange={(e) =>
                          setTech({ ...tech, has_video: e.target.checked })
                        }
                      />
                    }
                    label="Contains video"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tech.has_audio}
                        onChange={(e) =>
                          setTech({ ...tech, has_audio: e.target.checked })
                        }
                      />
                    }
                    label="Contains audio"
                  />

                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={tech.needs_internet}
                        onChange={(e) =>
                          setTech({
                            ...tech,
                            needs_internet: e.target.checked,
                          })
                        }
                      />
                    }
                    label="Requires Internet"
                  />
                </div>

                <Button
                  variant="contained"
                  className="mt-3"
                  onClick={saveTechNotes}
                >
                  Save Notes
                </Button>
              </Card>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
