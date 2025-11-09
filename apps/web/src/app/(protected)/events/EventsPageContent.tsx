"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api";
import { validateFields } from "@/lib/validation";
import { Event } from "@/types";

interface EventFormFields {
  title: string;
  description: string;
  start_time: string;
  end_time: string;
  location: string;
}

export default function EventsPageContent() {
  const [events, setEvents] = useState<Event[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Event | null>(null);
  const [form, setForm] = useState<EventFormFields>({
    title: "",
    description: "",
    start_time: "",
    end_time: "",
    location: "",
  });
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof EventFormFields, string>>>({});

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
  }, []);

  const handleSave = async () => {
    // validate before saving
    const errors = validateFields(form, ["title", "start_time", "end_time"]);
    const typedErrors: Partial<Record<keyof EventFormFields, string>> = {};
    Object.keys(errors).forEach((key) => {
      if (key in form) typedErrors[key as keyof EventFormFields] = errors[key as keyof typeof errors] as string;
    });
    setFieldErrors(typedErrors);

    if (Object.keys(typedErrors).length > 0) return; // stop save if errors

    try {
      if (editing && editing.id) {
        await apiPut(`/api/events/${editing.id}`, form);
      } else {
        await apiPost("/api/events", form);
      }
      await load();
      setOpen(false);
      setEditing(null);
      setForm({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        location: "",
      });
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

  return (
    <div className="min-h-screen bg-background text-foreground py-12">
      <div className="max-w-4xl mx-auto px-4">
        <header className="mb-10 text-center">
          <h1 className="text-4xl font-bold mb-2">Events</h1>
          <p className="text-muted-foreground">Create and manage conference events</p>
        </header>

        {/* Action Buttons */}
        <div className="flex gap-3 mb-8 justify-center">
          <button
            onClick={() => {
              setEditing(null);
              setForm({ title: "", description: "", start_time: "", end_time: "", location: "" });
              setFieldErrors({});
              setOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium shadow-sm hover:bg-primary/90 transition-all"
          >
            + Add Event
          </button>
        </div>

        {/* Events List */}
        <div className="bg-card border border-gray-200 rounded-2xl shadow-sm divide-y divide-gray-200">
          {events.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No events found.</p>
          ) : (
            events.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-6 py-4 hover:bg-muted transition-all">
                <div>
                  <h3 className="text-base font-semibold">{e.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {e.start_time ? `${e.start_time} @ ${e.location || "TBA"}` : e.location || "No location"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(e)}
                    className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-foreground bg-card hover:bg-muted transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => remove(e.id)}
                    className="rounded-md border border-red-300 text-red-600 px-3 py-1.5 text-sm bg-red-50 hover:bg-red-100 transition-all"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 bg-white/10 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-lg mx-4">
            <div className="border-b border-gray-200 px-6 py-4">
              <h2 className="text-lg font-semibold">{editing ? "Edit Event" : "Add Event"}</h2>
            </div>
            <div className="p-6 space-y-4">
              {/** Title Field */}
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                    fieldErrors.title ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-primary/40"
                  }`}
                />
                {fieldErrors.title && <p className="text-red-500 text-xs mt-1">{fieldErrors.title}</p>}
              </div>

              {/** Description Field */}
              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>

              {/** Start/End Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={form.start_time}
                    onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      fieldErrors.start_time ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-primary/40"
                    }`}
                  />
                  {fieldErrors.start_time && <p className="text-red-500 text-xs mt-1">{fieldErrors.start_time}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={form.end_time}
                    onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                    className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 ${
                      fieldErrors.end_time ? "border-red-500 focus:ring-red-300" : "border-gray-300 focus:ring-primary/40"
                    }`}
                  />
                  {fieldErrors.end_time && <p className="text-red-500 text-xs mt-1">{fieldErrors.end_time}</p>}
                </div>
              </div>

              {/** Location Field */}
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setForm({ ...form, location: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div className="border-t border-gray-200 px-6 py-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  setOpen(false);
                  setEditing(null);
                  setFieldErrors({});
                }}
                className="px-4 py-2 rounded-md border border-gray-300 text-sm text-foreground bg-card hover:bg-muted transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
