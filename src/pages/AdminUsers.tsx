import { useEffect, useState } from "react";
import api from "../api/axios";

type User = {
  id: string;
  publicId: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  active: boolean;
};

type EditUser = {
  publicId: string;
  name: string;
  phone?: string;
  role: string;
};

function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditUser | null>(null);

  // 🔥 delete confirmation target
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);

  // 🔔 feedback message
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "error"
  >("success");

  // 🔍 pagination + search
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);
  const [search, setSearch] = useState("");

  // =========================
  // MESSAGE HELPER
  // =========================
  const showMessage = (
    msg: string,
    type: "success" | "warning" | "error" = "success"
  ) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 3000);
  };

  // =========================
  // LOAD USERS (PAGED)
  // =========================
  useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await api.get("/admin/users", {
          params: { page, size, search },
        });

        if (!mounted) return;

        setUsers(res.data.content);
        setTotalPages(res.data.totalPages);
      } catch {
        if (mounted) setUsers([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [page, size, search]);

  // =========================
  // REFRESH
  // =========================
  const refresh = async () => {
    const res = await api.get("/admin/users", {
      params: { page, size, search },
    });

    if (res.data.content.length === 0 && page > 0) {
      setPage((p) => p - 1);
      return;
    }

    setUsers(res.data.content);
    setTotalPages(res.data.totalPages);
  };

  // =========================
  // ACTIONS
  // =========================
  const toggleUser = async (u: User) => {
    await api.patch(`/admin/users/${u.publicId}/toggle`);
    refresh();

    showMessage(
      u.active
        ? `User ${u.publicId} disabled`
        : `User ${u.publicId} enabled`,
      "warning"
    );
  };

  // ✅ FINAL DELETE (called from modal)
  const confirmDelete = async () => {
    if (!deleteTarget) return;

    await api.delete(`/admin/users/${deleteTarget.publicId}`);
    setDeleteTarget(null);
    refresh();

    showMessage(
      `User ${deleteTarget.publicId} permanently deleted`,
      "error"
    );
  };

  const saveEdit = async () => {
    if (!editing) return;

    await api.put(`/admin/users/${editing.publicId}`, {
      name: editing.name,
      phone: editing.phone,
      role: editing.role,
    });

    setEditing(null);
    refresh();
    showMessage(
      `User ${editing.publicId} updated successfully`,
      "success"
    );
  };

  // =========================
  // UI
  // =========================
  return (
    <div className="max-w-6xl space-y-6">
      <h1 className="text-2xl font-bold">Admin · Users</h1>

      {/* 🔔 MESSAGE */}
      {message && (
        <div
          className={`px-4 py-2 rounded text-sm font-medium ${
            messageType === "success"
              ? "bg-green-100 text-green-700"
              : messageType === "warning"
              ? "bg-yellow-100 text-yellow-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {message}
        </div>
      )}

      {/* 🔍 SEARCH */}
      <input
        className="border p-2 w-full"
        placeholder="Search by name, email, phone, public ID"
        value={search}
        onChange={(e) => {
          setPage(0);
          setSearch(e.target.value);
        }}
      />

      {loading ? (
        <p className="text-gray-500">Loading users…</p>
      ) : (
        <div className="bg-white rounded shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-3 text-left">Public ID</th>
                <th className="p-3 text-left">Name</th>
                <th className="p-3 text-left">Email</th>
                <th className="p-3 text-left">Phone</th>
                <th className="p-3 text-left">Role</th>
                <th className="p-3 text-left">Status</th>
                <th className="p-3 text-right">Actions</th>
              </tr>
            </thead>

            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t">
                  <td className="p-3 font-mono">{u.publicId}</td>
                  <td className="p-3">{u.name || "-"}</td>
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.phone || "-"}</td>
                  <td className="p-3">{u.role}</td>

                  <td className="p-3">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        u.active
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-200 text-gray-600"
                      }`}
                    >
                      {u.active ? "Active" : "Disabled"}
                    </span>
                  </td>

                  <td className="p-3 text-right space-x-2">
                    <button
                      onClick={() =>
                        setEditing({
                          publicId: u.publicId,
                          name: u.name || "",
                          phone: u.phone,
                          role: u.role,
                        })
                      }
                      className="px-3 py-1 bg-blue-600 text-white rounded"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => toggleUser(u)}
                      className="px-3 py-1 bg-yellow-500 text-white rounded"
                    >
                      {u.active ? "Disable" : "Enable"}
                    </button>

                    <button
                      onClick={() => setDeleteTarget(u)}
                      className="px-3 py-1 bg-red-600 text-white rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* 📄 PAGINATION */}
          <div className="flex justify-between p-4">
            <button
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Prev
            </button>

            <span>
              Page {page + 1} of {totalPages}
            </span>

            <button
              disabled={page + 1 >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="px-3 py-1 border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* =========================
          EDIT MODAL
      ========================= */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded shadow w-96 space-y-4">
            <h2 className="text-lg font-semibold">
              Edit User {editing.publicId}
            </h2>

            <input
              className="border p-2 w-full"
              placeholder="Name"
              value={editing.name}
              onChange={(e) =>
                setEditing({ ...editing, name: e.target.value })
              }
            />

            <input
              className="border p-2 w-full"
              placeholder="Phone"
              value={editing.phone || ""}
              onChange={(e) =>
                setEditing({ ...editing, phone: e.target.value })
              }
            />

            <select
              className="border p-2 w-full"
              value={editing.role}
              onChange={(e) =>
                setEditing({ ...editing, role: e.target.value })
              }
            >
              <option value="ROLE_ADMIN">ADMIN</option>
              <option value="ROLE_PARENT">PARENT</option>
              <option value="ROLE_PLAYER">PLAYER</option>
            </select>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setEditing(null)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={saveEdit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================
          DELETE CONFIRM MODAL
      ========================= */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded shadow-lg w-96 space-y-4">
            <h2 className="text-lg font-semibold text-red-600">
              Delete User
            </h2>

            <p className="text-sm text-gray-700">
              Are you sure you want to permanently delete
              <span className="font-semibold">
                {" "}
                {deleteTarget.publicId}
              </span>
              ?
            </p>

            <p className="text-sm text-red-500">
              This action cannot be undone.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminUsers;
