"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiGet, apiPost, apiPut } from "@/lib/api";
import { User } from "@/types/index";

const ROLES = ["admin", "technician", "client", "uploader"] as const;

type FormState = {
  id?: number;
  email: string;
  password?: string;
  role: (typeof ROLES)[number];
  isActive?: boolean;
};

export default function AdminUsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<FormState | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // FRONTEND GUARD (UX only)
  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem("auth") || "{}");
    if (auth.role !== "admin") {
      router.replace("/login");
      return;
    }
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await apiGet<User[]>("/api/admin/users");
      setUsers(data);
    } catch (err) {
      console.error("Failed to load users", err);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingUser({
      email: "",
      role: "client",
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (user: User) => {
    setEditingUser({
      id: user.id,
      email: user.email,
      role: user.role,
      isActive: user.is_active,
    });
    setIsModalOpen(true);
  };

  const saveUser = async () => {
    if (!editingUser) return;

    if (!editingUser.email) return alert("Email is required");
    if (!editingUser.role) return alert("Role is required");
    if (!editingUser.id && !editingUser.password)
      return alert("Password is required for new users");

    const payload: any = {
      email: editingUser.email,
      role: editingUser.role,
      is_active: editingUser.isActive ?? true,
    };

    if (editingUser.password) {
      payload.password = editingUser.password;
    }

    try {
      if (editingUser.id) {
        await apiPut(`/api/admin/users/${editingUser.id}`, payload);
      } else {
        await apiPost("/api/admin/users", payload);
      }
      setIsModalOpen(false);
      setEditingUser(null);
      loadUsers();
    } catch (err: unknown) {
      console.error("Failed to save user", err);

      if (
        typeof err === "object" &&
        err !== null &&
        "response" in err &&
        typeof (err as { response?: { data?: { detail?: string } } }).response
          ?.data?.detail === "string"
      ) {
        alert(
          (err as { response: { data: { detail: string } } }).response.data
            .detail,
        );
      } else {
        alert("Something went wrong");
      }
    }
  };

  if (loading) {
    return <div className="p-6 text-center">Loading users…</div>;
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">User Administration</h1>
        <button
          onClick={openAddModal}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          + Add User
        </button>
      </div>

      <table className="w-full border rounded overflow-hidden">
        <thead className="bg-gray-100 text-left">
          <tr>
            <th className="p-2">Email</th>
            <th className="p-2">Role</th>
            <th className="p-2">Active</th>
            <th className="p-2">Created</th>
            <th className="p-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t">
              <td className="p-2">{u.email}</td>
              <td className="p-2">{u.role}</td>
              <td className="p-2">{u.is_active ? "✅" : "❌"}</td>
              <td className="p-2 text-sm text-gray-500">
                {new Date(u.created_at).toLocaleDateString()}
              </td>
              <td className="p-2">
                <button
                  onClick={() => openEditModal(u)}
                  className="text-blue-600 hover:underline text-sm"
                >
                  Edit
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* MODAL */}
      {isModalOpen && editingUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded w-full max-w-md">
            <h2 className="font-semibold text-lg mb-4">
              {editingUser.id ? "Edit User" : "Add User"}
            </h2>

            <input
              type="email"
              placeholder="Email"
              value={editingUser.email}
              disabled={!!editingUser.id}
              onChange={(e) =>
                setEditingUser({ ...editingUser, email: e.target.value })
              }
              className="w-full border rounded px-3 py-2 mb-2"
            />

            {!editingUser.id && (
              <input
                type="password"
                placeholder="Password"
                value={editingUser.password ?? ""}
                onChange={(e) =>
                  setEditingUser({
                    ...editingUser,
                    password: e.target.value,
                  })
                }
                className="w-full border rounded px-3 py-2 mb-2"
              />
            )}

            <select
              value={editingUser.role}
              onChange={(e) =>
                setEditingUser({
                  ...editingUser,
                  role: e.target.value as FormState["role"],
                })
              }
              className="w-full border rounded px-3 py-2 mb-2"
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>

            <label className="flex items-center gap-2 mb-4">
              <input
                type="checkbox"
                checked={editingUser.isActive}
                onChange={(e) =>
                  setEditingUser({
                    ...editingUser,
                    isActive: e.target.checked,
                  })
                }
              />
              Active
            </label>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsModalOpen(false)}
                className="px-3 py-1 bg-gray-100 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveUser}
                className="px-4 py-1 bg-blue-600 text-white rounded"
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
