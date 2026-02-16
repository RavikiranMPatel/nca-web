import { useEffect, useState } from "react";
import api from "../api/axios";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Search,
  ChevronLeft,
  ChevronRight,
  UserX,
  AlertTriangle,
} from "lucide-react";

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
  const navigate = useNavigate();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<EditUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageType, setMessageType] = useState<
    "success" | "warning" | "error"
  >("success");
  const [page, setPage] = useState(0);
  const [size] = useState(10);
  const [totalPages, setTotalPages] = useState(0);

  // ⭐ CHANGED: Two separate states for search
  const [searchInput, setSearchInput] = useState(""); // What user types
  const [search, setSearch] = useState(""); // What gets sent to API

  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "disabled"
  >("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");

  const showMessage = (
    msg: string,
    type: "success" | "warning" | "error" = "success",
  ) => {
    setMessage(msg);
    setMessageType(type);
    setTimeout(() => setMessage(null), 4000);
  };

  // ⭐ NEW: Debounce search - wait 500ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(0);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ⭐ CHANGED: Now only triggers on 'search' (not 'searchInput')
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

  const toggleUser = async (u: User) => {
    try {
      await api.patch(`/admin/users/${encodeURIComponent(u.publicId)}/toggle`);
      refresh();
      showMessage(
        u.active ? `User ${u.publicId} disabled` : `User ${u.publicId} enabled`,
        "warning",
      );
    } catch (e: any) {
      showMessage(e?.response?.data?.message ?? "Action failed", "error");
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    try {
      await api.delete(
        `/admin/users/${encodeURIComponent(deleteTarget.publicId)}`,
      );
      setDeleteTarget(null);
      refresh();
      showMessage(
        `User ${deleteTarget.publicId} permanently deleted`,
        "success",
      );
    } catch (e: any) {
      showMessage(e?.response?.data?.message ?? "Delete failed", "error");
    }
  };

  const saveEdit = async () => {
    if (!editing) return;

    try {
      await api.put(`/admin/users/${editing.publicId}`, {
        name: editing.name,
        phone: editing.phone,
        role: editing.role,
      });
      setEditing(null);
      refresh();
      showMessage("User updated successfully", "success");
    } catch (e: any) {
      showMessage(e?.response?.data?.message ?? "Update failed", "error");
    }
  };

  // Get unique roles for filter
  const roles = Array.from(new Set(users.map((u) => u.role)));

  // Apply filters (client-side filtering)
  const filteredUsers = users.filter((u) => {
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && u.active) ||
      (statusFilter === "disabled" && !u.active);
    const matchesRole = roleFilter === "all" || u.role === roleFilter;

    return matchesStatus && matchesRole;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading users...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* HEADER */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/admin")}
            className="p-2 hover:bg-gray-100 rounded-full transition"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              User Management
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""}{" "}
              found
            </p>
          </div>
        </div>

        {/* MESSAGE TOAST */}
        {message && (
          <div
            className={`px-6 py-4 rounded-xl text-sm font-medium shadow-lg border-l-4 animate-fade-in ${
              messageType === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-500"
                : messageType === "warning"
                  ? "bg-amber-50 text-amber-800 border-amber-500"
                  : "bg-red-50 text-red-800 border-red-500"
            }`}
          >
            {message}
          </div>
        )}

        {/* FILTERS & SEARCH */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          {/* ⭐ CHANGED: Search now uses searchInput */}
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
              size={20}
            />
            <input
              className="w-full pl-12 pr-4 py-3 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              placeholder="Search by name, email, or ID..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
            {/* ⭐ NEW: Loading spinner while debouncing */}
            {searchInput && searchInput !== search && (
              <div className="absolute right-4 top-1/2 -translate-y-1/2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
              </div>
            )}
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-3">
            {/* Status Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Status</option>
                <option value="active">Active Only</option>
                <option value="disabled">Disabled Only</option>
              </select>
            </div>

            {/* Role Filter */}
            <div className="flex-1 min-w-[200px]">
              <label className="text-xs font-medium text-slate-600 mb-1.5 block">
                Role
              </label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all text-sm"
              >
                <option value="all">All Roles</option>
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role.replace("ROLE_", "")}
                  </option>
                ))}
              </select>
            </div>

            {/* ⭐ CHANGED: Reset now clears both searchInput and search */}
            {(searchInput ||
              statusFilter !== "all" ||
              roleFilter !== "all") && (
              <button
                onClick={() => {
                  setSearchInput("");
                  setSearch("");
                  setStatusFilter("all");
                  setRoleFilter("all");
                }}
                className="self-end px-4 py-2 text-sm text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-all"
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>

        {/* MOBILE CARDS */}
        <div className="md:hidden space-y-3">
          {filteredUsers.map((u) => (
            <div
              key={u.id}
              className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-semibold text-slate-900 text-lg">
                    {u.name || "No name"}
                  </p>
                  <p className="text-xs text-slate-500 font-mono mt-1">
                    {u.publicId}
                  </p>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${
                    u.active
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  {u.active ? "Active" : "Disabled"}
                </span>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Email:</span>
                  <span className="font-medium text-slate-900 truncate ml-2">
                    {u.email}
                  </span>
                </div>
                {u.phone && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Phone:</span>
                    <span className="font-medium text-slate-900">
                      {u.phone}
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Role:</span>
                  <span className="font-medium text-slate-900">
                    {u.role.replace("ROLE_", "")}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() =>
                    setEditing({
                      publicId: u.publicId,
                      name: u.name || "",
                      phone: u.phone,
                      role: u.role,
                    })
                  }
                  className="py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Edit
                </button>

                <button
                  onClick={() => toggleUser(u)}
                  className={`py-2 rounded-lg text-sm font-medium transition-all ${
                    u.active
                      ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                      : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                  }`}
                >
                  {u.active ? "Disable" : "Enable"}
                </button>

                <button
                  onClick={() => setDeleteTarget(u)}
                  className="py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* DESKTOP TABLE */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    User ID
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200">
                {filteredUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-sm text-slate-700">
                        {u.publicId}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-medium text-slate-900">
                        {u.name || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">{u.email}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-slate-600">
                        {u.phone || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-700">
                        {u.role.replace("ROLE_", "")}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                          u.active
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {u.active ? "Active" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() =>
                          setEditing({
                            publicId: u.publicId,
                            name: u.name || "",
                            phone: u.phone,
                            role: u.role,
                          })
                        }
                        className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-all"
                      >
                        Edit
                      </button>

                      <button
                        onClick={() => toggleUser(u)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                          u.active
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200"
                            : "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                        }`}
                      >
                        {u.active ? "Disable" : "Enable"}
                      </button>

                      <button
                        onClick={() => setDeleteTarget(u)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-all"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white rounded-xl shadow-sm border border-slate-200 px-6 py-4">
            <p className="text-sm text-slate-600">
              Page {page + 1} of {totalPages}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={20} />
              </button>

              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i;
                  } else if (page <= 2) {
                    pageNum = i;
                  } else if (page >= totalPages - 3) {
                    pageNum = totalPages - 5 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }

                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        page === pageNum
                          ? "bg-blue-600 text-white"
                          : "text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {pageNum + 1}
                    </button>
                  );
                })}
              </div>

              <button
                onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {filteredUsers.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
            <div className="text-slate-400 mb-4">
              <UserX size={48} className="mx-auto" />
            </div>
            <h3 className="text-lg font-semibold text-slate-700 mb-2">
              No users found
            </h3>
            <p className="text-slate-500 text-sm">
              Try adjusting your search or filters
            </p>
          </div>
        )}

        {/* EDIT MODAL */}
        {editing && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
              <div className="border-b border-slate-200 px-6 py-4">
                <h2 className="text-xl font-bold text-slate-900">Edit User</h2>
                <p className="text-sm text-slate-500 mt-1">
                  {editing.publicId}
                </p>
              </div>

              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Name
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="Enter name"
                    value={editing.name}
                    onChange={(e) =>
                      setEditing({ ...editing, name: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Phone
                  </label>
                  <input
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    placeholder="Enter phone number"
                    value={editing.phone || ""}
                    onChange={(e) =>
                      setEditing({ ...editing, phone: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Role
                  </label>
                  <select
                    className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                    value={editing.role}
                    onChange={(e) =>
                      setEditing({ ...editing, role: e.target.value })
                    }
                  >
                    <option value="ROLE_SUPER_ADMIN">SUPER ADMIN</option>
                    <option value="ROLE_ADMIN">ADMIN</option>
                    <option value="ROLE_PARENT">PARENT</option>
                    <option value="ROLE_PLAYER">PLAYER</option>
                  </select>
                </div>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setEditing(null)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEdit}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* DELETE MODAL */}
        {deleteTarget && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
              <div className="border-b border-red-100 px-6 py-4 bg-red-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertTriangle className="text-red-600" size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-red-900">
                      Delete User
                    </h2>
                    <p className="text-sm text-red-600 mt-0.5">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <p className="text-slate-700">
                  Are you sure you want to permanently delete user{" "}
                  <span className="font-semibold text-slate-900">
                    {deleteTarget.publicId}
                  </span>
                  ?
                </p>
                <p className="text-sm text-slate-500 mt-2">
                  All associated data will be removed from the system.
                </p>
              </div>

              <div className="border-t border-slate-200 px-6 py-4 flex justify-end gap-3">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all shadow-sm"
                >
                  Delete User
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminUsers;
