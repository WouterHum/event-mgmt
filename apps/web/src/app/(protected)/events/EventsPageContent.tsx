"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { validateFields } from "@/lib/validation";
import { Event } from "@/types";
import { useAtom } from "jotai";
import { selectedEventAtom } from "@/app/components/NavBar";

interface EventFormFields {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
}

export default function EventsPageContent() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [, setSelectedEvent] = useAtom(selectedEventAtom);
  const [form, setForm] = useState<EventFormFields>({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
  });
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof EventFormFields, string>>
  >({});

  const load = async () => {
    try {
      const data = await apiGet<Event[]>("/api/events");
      setEvents(data);
    } catch (err) {
      console.error("Failed to load events:", err);
    }
  };

  useEffect(() => {
    load();
    // FIX #8: Clear selected event when on events page
    setSelectedEvent(null);
  }, []);

  const handleSave = async () => {
    const errors = validateFields(form, ["title", "start_time", "end_time"]);
    const typedErrors: Partial<Record<keyof EventFormFields, string>> = {};
    Object.keys(errors).forEach((key) => {
      if (key in form)
        typedErrors[key as keyof EventFormFields] = errors[key as keyof typeof errors] as string;
    });
    setFieldErrors(typedErrors);
    if (Object.keys(typedErrors).length > 0) return;

    try {
      if (editing && editing.id) {
        await apiPut(`/api/events/${editing.id}`, form);
      } else {
        await apiPost("/api/events", form);
      }
      await load();
      setOpen(false);
      setEditing(null);
      setForm({ title: "", description: "", start_time: "", end_time: "", location: "" });
      setFieldErrors({});
    } catch (err) {
      console.error("Failed to save event:", err);
    }
  };

  const handleEdit = (e: Event) => {
    setEditing(e);
    setForm({
      title: e.title || "",
      description: e.description || "",
      start_time: e.start_time || "",
      end_time: e.end_time || "",
      location: e.location || "",
    });
    setFieldErrors({});
    setOpen(true);
  };

  const remove = async (id?: number) => {
    if (!id) return;
    try {
      await apiDelete(`/api/events/${id}`);
      await load();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  };

  // FIX #8: Select event and navigate, activating event-scoped nav tabs
  const handleSelectEvent = (event: Event) => {
    setSelectedEvent({ id: event.id!, title: event.title });
    router.push(`/speakers-management?eventId=${event.id}`);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1 className="page-title">Events</h1>
        <p className="page-subtitle">Select an event to manage its speakers, rooms and uploads</p>
      </div>

      <div className="my-6 flex justify-end">
        <button
          onClick={() => {
            setEditing(null);
            setForm({ title: "", description: "", start_time: "", end_time: "", location: "" });
            setFieldErrors({});
            setOpen(true);
          }}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-600 transition-all shadow-sm"
        >
          + Create Event
        </button>
      </div>

      <div className="modern-card border border-gray-200 rounded-xl">
        {events.length === 0 ? (
          <p className="text-gray-500 text-center py-8">No events yet. Create one to get started.</p>
        ) : (
          <ul>
            {events.map((event, idx) => (
              <li
                key={event.id}
                className={`flex justify-between items-center py-4 px-6 hover:bg-gray-50 transition ${
                  idx !== events.length - 1 ? "border-b border-gray-200" : ""
                }`}
              >
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 text-lg">{event.title}</p>
                  {event.location && (
                    <p className="text-sm text-gray-500">📍 {event.location}</p>
                  )}
                  {event.start_time && (
                    <p className="text-sm text-gray-500">
                      🗓 {new Date(event.start_time).toLocaleDateString()} —{" "}
                      {event.end_time ? new Date(event.end_time).toLocaleDateString() : ""}
                    </p>
                  )}
                </div>
                <div className="flex gap-3">
                  {/* FIX #8: Clicking the event name sets the selected event */}
                  <button
                    onClick={() => handleSelectEvent(event)}
                    className="px-4 py-2 rounded-lg font-semibold bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 transition"
                  >
                    Open Event →
                  </button>
                  <button
                    onClick={() => handleEdit(event)}
                    className="px-4 py-2 rounded-lg font-semibold bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200 transition"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(event.id)}
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

      {/* Add/Edit Event Dialog */}
      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4 p-6">
            <h2 className="text-xl font-semibold border-b border-gray-200 pb-3 mb-4">
              {editing ? "Edit Event" : "Create Event"}
            </h2>

            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  placeholder="Event Title *"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
              </div>
              <textarea
                placeholder="Description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div>
                <label className="block text-sm text-gray-600 mb-1">Start Date/Time *</label>
                <input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fieldErrors.start_time && <p className="text-red-500 text-xs mt-1">{fieldErrors.start_time}</p>}
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1">End Date/Time *</label>
                <input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {fieldErrors.end_time && <p className="text-red-500 text-xs mt-1">{fieldErrors.end_time}</p>}
              </div>
              <input
                type="text"
                placeholder="Location"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-gray-200">
              <button
                onClick={() => { setOpen(false); setEditing(null); }}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-gray-700 bg-white hover:bg-gray-100 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md text-sm font-medium text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 transition shadow-sm"
              >
                {editing ? "Save Changes" : "Create Event"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}