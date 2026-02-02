"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from "@mui/material";

interface Event {
  id: number;
  title: string;
  start_time?: string;
  end_time?: string;
}

interface Speaker {
  id?: number;
  name: string;
  event_id: number;
}

export default function SpeakersManagementPage() {
  const searchParams = useSearchParams();
  const eventId = searchParams.get("eventId");

  const [event, setEvent] = useState<Event | null>(null);
  const [speakers, setSpeakers] = useState<Speaker[]>([]);
  const [filteredSpeakers, setFilteredSpeakers] = useState<Speaker[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<Speaker>({
    name: "",
    event_id: Number(eventId),
  });
  const [errors, setErrors] = useState<{ name?: string }>({});

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  useEffect(() => {
    // Client-side search (case-insensitive)
    if (searchQuery.trim() === "") {
      setFilteredSpeakers(speakers);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = speakers.filter((s) =>
        s.name.toLowerCase().includes(query),
      );
      setFilteredSpeakers(filtered);
    }
  }, [searchQuery, speakers]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [eventData, speakersData] = await Promise.all([
        apiGet<Event>(`/api/events/${eventId}`),
        apiGet<Speaker[]>(`/api/events/${eventId}/speakers`),
      ]);
      setEvent(eventData);
      setSpeakers(speakersData);
      setFilteredSpeakers(speakersData);
    } catch (err) {
      console.error("Failed to load data:", err);
    } finally {
      setLoading(false);
    }
  };

  const validateSpeaker = (speaker: { name: string }) => {
    const errors: { name?: string } = {};
    if (!speaker.name || speaker.name.trim() === "") {
      errors.name = "Name is required";
    }
    return errors;
  };

  const saveSpeaker = async () => {
    try {
      const fieldErrors = validateSpeaker(form);
      setErrors(fieldErrors);

      if (Object.keys(fieldErrors).length > 0) return;

      await apiPost("/api/speakers/", {
        name: form.name,
        event_id: Number(eventId), // Send event_id to link in junction table
      });

      await loadData();
      setOpen(false);
      setForm({ name: "", event_id: Number(eventId) });
      setErrors({});
    } catch (err) {
      console.error("Failed to save speaker:", err);
      alert("Save failed – check console for details.");
    }
  };

  const removeSpeaker = async (id?: number) => {
    if (!id || !confirm("Delete this speaker and all their sessions?")) return;
    try {
      await apiDelete(`/api/speakers/${id}`);
      await loadData();
    } catch (err) {
      console.error("Failed to delete speaker:", err);
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
      <div className="page-header">
        <div className="flex items-center gap-4 mb-2">
          <a
            href="/events"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            ← Back to Events
          </a>
        </div>
        {event && (
          <div>
            <h1 className="page-title">{event.title}</h1>
            <p className="page-subtitle">Manage speakers and sessions</p>
          </div>
        )}
      </div>

      {/* Search and Add Section */}
      <div className="my-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search speakers by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => {
            setForm({ name: "", event_id: Number(eventId) });
            setErrors({});
            setOpen(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
        >
          + Add Speaker
        </button>
      </div>

      {/* Speakers List */}
      <div className="modern-card border border-gray-200 rounded-xl">
        {filteredSpeakers.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {searchQuery
              ? "No speakers found matching your search"
              : "No speakers added yet"}
          </p>
        ) : (
          <ul>
            {filteredSpeakers.map((speaker, idx) => (
              <li
                key={speaker.id}
                className={`flex justify-between items-center py-4 px-6 hover:bg-gray-50 transition ${
                  idx !== filteredSpeakers.length - 1
                    ? "border-b border-gray-200"
                    : ""
                }`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-lg">
                    {speaker.name}
                  </p>
                  <p className="text-sm text-gray-500">
                    <a
                      href={`/speaker-sessions?speakerId=${speaker.id}&eventId=${eventId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Manage sessions →
                    </a>
                  </p>
                </div>
                <div className="flex gap-3">
                  <a
                    href={`/speaker-sessions?speakerId=${speaker.id}&eventId=${eventId}`}
                    className="px-4 py-2 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition"
                  >
                    Manage Sessions
                  </a>
                  <button
                    onClick={() => removeSpeaker(speaker.id)}
                    className="px-4 py-2 rounded-lg font-semibold bg-red-100 text-red-700 hover:bg-red-200 border border-red-200 transition"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Add Speaker Dialog */}
      <Dialog
        open={open}
        onClose={() => {
          setOpen(false);
          setForm({ name: "", event_id: Number(eventId) });
          setErrors({});
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
          Add Speaker
        </DialogTitle>

        <DialogContent className="space-y-4 py-5">
          <TextField
            fullWidth
            label="Speaker Name"
            value={form.name}
            onChange={(e) => {
              const name = e.target.value;
              setForm({ ...form, name });
              setErrors(validateSpeaker({ name }));
            }}
            error={!!errors.name}
            helperText={errors.name}
          />
        </DialogContent>

        <DialogActions className="flex justify-end gap-3 p-4 border-t border-gray-200">
          <button
            onClick={() => {
              setOpen(false);
              setForm({ name: "", event_id: Number(eventId) });
              setErrors({});
            }}
            className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={saveSpeaker}
            className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
          >
            Add Speaker
          </button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
