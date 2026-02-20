"use client";

import { useState } from "react";
import {
  LinearProgress,
  Button,
  Checkbox,
  FormControlLabel,
} from "@mui/material";
import axios from "axios";

interface RoomUploaderProps {
  roomId: number;
  onUploaded: () => void; // callback to refresh room data
}

export default function RoomUploader({
  roomId,
  onUploaded,
}: RoomUploaderProps) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [tech, setTech] = useState({
    has_video: false,
    has_audio: false,
    needs_internet: false,
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!files || files.length === 0) return;

    setUploading(true);
    const formData = new FormData();
    Array.from(files).forEach((file) => formData.append("files", file));
    formData.append("has_video", String(tech.has_video));
    formData.append("has_audio", String(tech.has_audio));
    formData.append("needs_internet", String(tech.needs_internet));

    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const url = `${baseUrl}/api/rooms/${roomId}/uploads`;

      await axios.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round(
            (progressEvent.loaded * 100) / (progressEvent.total || 1),
          );
          setProgress(percent);
        },
      });

      setFiles(null);
      setProgress(0);
      onUploaded(); // refresh room presentations/status
    } catch (err) {
      console.error("Upload failed", err);
      alert("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 mt-2">
      {/* <label className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-3 py-1 text-sm cursor-pointer hover:bg-primary/90">
        + Select Files
        <input
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </label> */}

      {/* {files && files.length > 0 && (
        <div className="text-sm text-gray-600">
          {Array.from(files).map((f, i) => (
            <div key={i}>{f.name}</div>
          ))}
        </div>
      )} */}

      <div className="flex gap-2">
        {/* <FormControlLabel
          control={
            <Checkbox
              checked={tech.has_video}
              onChange={(e) =>
                setTech({ ...tech, has_video: e.target.checked })
              }
            />
          }
          label="Video"
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
          label="Audio"
        />
        <FormControlLabel
          control={
            <Checkbox
              checked={tech.needs_internet}
              onChange={(e) =>
                setTech({ ...tech, needs_internet: e.target.checked })
              }
            />
          }
          label="Internet"
        /> */}
      </div>

      {/* {uploading && <LinearProgress variant="determinate" value={progress} />}

      <Button
        variant="contained"
        size="small"
        disabled={!files || uploading}
        onClick={handleUpload}
      >
        {uploading ? "Uploading..." : "Upload"}
      </Button> */}
    </div>
  );
}
