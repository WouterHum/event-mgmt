"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api";
import {
  Typography,
  Card,
  CardContent,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
} from "@mui/material";

interface UploadedFile {
  filename: string;
  display_name: string;
  path: string;
  assigned: boolean;
  size: number;
}

interface Speaker {
  id: number;
  name: string;
}

interface Session {
  id: number;
  speaker_id: number;
  speaker_name: string;
  room_name: string;
  session_date: string;
  session_time: string;
}

export default function FileAssignmentPage() {
  const searchParams = useSearchParams();
  const eventId = Number(searchParams.get("eventId"));

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [assignments, setAssignments] = useState<{
    [filename: string]: { speakerId?: number; sessionId?: number };
  }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    try {
      setLoading(true);

      // Get list of uploaded files (you'll need to create this endpoint)
      const filesData = await apiGet<UploadedFile[]>(
        `/api/events/${eventId}/unassigned-files`,
      );
      setUploadedFiles(filesData);

      // Get speakers for this event
      const speakersData = await apiGet<Speaker[]>(
        `/api/events/${eventId}/speakers`,
      );
      setSpeakers(speakersData);

      // Get all sessions for this event
      const sessionsData = await apiGet<Session[]>(
        `/api/events/${eventId}/sessions`,
      );
      setSessions(sessionsData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSpeakerChange = (filename: string, speakerId: number) => {
    setAssignments({
      ...assignments,
      [filename]: { ...assignments[filename], speakerId },
    });
  };

  const handleSessionChange = (filename: string, sessionId: number) => {
    setAssignments({
      ...assignments,
      [filename]: { ...assignments[filename], sessionId },
    });
  };

  const assignFile = async (filename: string) => {
    const assignment = assignments[filename];

    if (!assignment?.sessionId) {
      alert("Please select a session");
      return;
    }

    try {
      // Move file from uploads folder to session
      await apiPost(`/api/files/uploads/${assignment.sessionId}/assign-file`, {
        filename: filename,
        event_id: eventId,
      });

      alert("File assigned successfully!");
      await loadData();
    } catch (err) {
      console.error("Failed to assign file:", err);
      alert("Failed to assign file");
    }
  };

  const getSessionsForSpeaker = (speakerId: number) => {
    return sessions.filter((s) => s.speaker_id === speakerId);
  };

  if (loading) {
    return (
      <div className="p-6">
        <Typography>Loading...</Typography>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <a
          href={`/event-dashboard?eventId=${eventId}`}
          className="text-blue-600 hover:text-blue-800"
        >
          ← Back to Dashboard
        </a>
      </div>

      <Typography variant="h4" className="mb-2">
        Assign Uploaded Files
      </Typography>
      <Typography variant="body2" color="text.secondary" className="mb-6">
        Link each uploaded file to a specific speaker session
      </Typography>

      {uploadedFiles.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="text.secondary">
              No unassigned files found. All uploads have been linked to
              sessions.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>Filename</strong>
                </TableCell>
                <TableCell>
                  <strong>Speaker</strong>
                </TableCell>
                <TableCell>
                  <strong>Session</strong>
                </TableCell>
                <TableCell>
                  <strong>Action</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {uploadedFiles.map((file) => {
                const selectedSpeaker = assignments[file.filename]?.speakerId;
                const selectedSession = assignments[file.filename]?.sessionId;
                const speakerSessions = selectedSpeaker
                  ? getSessionsForSpeaker(selectedSpeaker)
                  : [];

                return (
                  <TableRow key={file.filename}>
                    <TableCell>
                      <Typography variant="body2" className="font-mono">
                        {file.display_name || file.filename}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {(file.size / 1024 / 1024).toFixed(2)} MB
                      </Typography>
                    </TableCell>

                    <TableCell>
                      <FormControl fullWidth size="small">
                        <InputLabel>Select Speaker</InputLabel>
                        <Select
                          value={selectedSpeaker || ""}
                          onChange={(e) =>
                            handleSpeakerChange(
                              file.filename,
                              Number(e.target.value),
                            )
                          }
                          label="Select Speaker"
                        >
                          {speakers.map((speaker) => (
                            <MenuItem key={speaker.id} value={speaker.id}>
                              {speaker.name}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      <FormControl
                        fullWidth
                        size="small"
                        disabled={!selectedSpeaker}
                      >
                        <InputLabel>Select Session</InputLabel>
                        <Select
                          value={selectedSession || ""}
                          onChange={(e) =>
                            handleSessionChange(
                              file.filename,
                              Number(e.target.value),
                            )
                          }
                          label="Select Session"
                        >
                          {speakerSessions.map((session) => (
                            <MenuItem key={session.id} value={session.id}>
                              {session.room_name} - {session.session_date}{" "}
                              {session.session_time}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                      {!selectedSpeaker && (
                        <Typography variant="caption" color="text.secondary">
                          Select speaker first
                        </Typography>
                      )}
                    </TableCell>

                    <TableCell>
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => assignFile(file.filename)}
                        disabled={!selectedSession}
                      >
                        Assign
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}
