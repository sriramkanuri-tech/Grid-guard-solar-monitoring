import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  CheckCircle,
  XCircle,
  Search,
  Filter,
  RefreshCw,
  HardDrive,
  X,
  Send,
} from "lucide-react";
import { rtdbService } from "../../firebase/database";
import { presenceService } from "../../services/presenceService";
import type { UserProfile, UserRole, UserAccountStatus } from "../../types/user";

export default function AdminMembers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [presenceMap, setPresenceMap] = useState<Record<string, { online: boolean }>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");

  // Add Member Form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<UserRole>("member");
  const [newStatus, setNewStatus] = useState<UserAccountStatus>("active");
  const [addLoading, setAddLoading] = useState(false);
  const [addMsg, setAddMsg] = useState("");

  // Email Form
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailStatus, setEmailStatus] = useState("");

  useEffect(() => {
    const unsubPresence = presenceService.subscribeStats((stats) => {
      setUsers(stats.users);
      setPresenceMap(stats.presenceMap);
    });

    return () => unsubPresence();
  }, []);

  const handleAddMember = async (e: FormEvent) => {
    e.preventDefault();
    setAddLoading(true);
    setAddMsg("");

    const cleanEmail = newEmail.trim().toLowerCase();
    const uid = "usr_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

    const newProfile: UserProfile = {
      uid,
      name: newName.trim(),
      email: cleanEmail,
      role: newRole,
      status: newStatus,
      isAdmin: newRole === "admin",
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: "Never",
      lastSeen: new Date().toISOString(),
    };

    try {
      await rtdbService.saveUserProfile(uid, newProfile);
      await rtdbService.logAuditEvent("ADMIN_CREATE_MEMBER", cleanEmail, { role: newRole, status: newStatus });

      // Dispatch onboarding email via backend
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";
      await fetch(`${backendUrl}/api/admin/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [cleanEmail],
          subject: "Welcome to Grid Guard Solar Monitoring Platform",
          message: `Hello ${newName},\n\nYour operator account on Grid Guard Solar Monitoring has been provisioned with the role of [${newRole.toUpperCase()}].\n\nYou can sign in to the platform using your email: ${cleanEmail}.\n\nAccess the portal: http://localhost:5174/login\n\nBest regards,\nGrid Guard Operations Team`,
        }),
      });

      setAddMsg("Member created successfully and invitation email dispatched!");
      setTimeout(() => {
        setShowAddModal(false);
        setNewName("");
        setNewEmail("");
        setAddMsg("");
      }, 1500);
    } catch (err: unknown) {
      setAddMsg(err instanceof Error ? err.message : "Failed to create member.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus: UserAccountStatus = user.status === "disabled" ? "active" : "disabled";
    await rtdbService.setUserStatus(user.uid, newStatus);
    await rtdbService.logAuditEvent(
      newStatus === "disabled" ? "DISABLE_MEMBER" : "ENABLE_MEMBER",
      user.email,
      { previousStatus: user.status }
    );
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (window.confirm(`Are you sure you want to permanently delete operator ${user.name} (${user.email})?`)) {
      await rtdbService.deleteUser(user.uid);
      await rtdbService.logAuditEvent("DELETE_MEMBER", user.email);
    }
  };

  const handleOpenEmailModal = (email: string) => {
    setSelectedUserEmail(email);
    setEmailSubject("");
    setEmailMessage("");
    setEmailStatus("");
    setShowEmailModal(true);
  };

  const handleSendEmail = async (e: FormEvent) => {
    e.preventDefault();
    setEmailLoading(true);
    setEmailStatus("");

    try {
      const backendUrl = import.meta.env.VITE_BACKEND_API_URL || "http://localhost:8000";
      const res = await fetch(`${backendUrl}/api/admin/send-email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipients: [selectedUserEmail],
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send email. Check backend SMTP configuration.");
      }

      setEmailStatus("Email dispatched successfully via Gmail SMTP!");
      setTimeout(() => {
        setShowEmailModal(false);
      }, 1500);
    } catch (err: unknown) {
      setEmailStatus(err instanceof Error ? err.message : "Email delivery failed.");
    } finally {
      setEmailLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchSearch =
      u.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = roleFilter === "ALL" || u.role === roleFilter;
    const matchStatus = statusFilter === "ALL" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const exportMembersCsv = () => {
    const headers = ["UID", "Name", "Email", "Role", "Status", "MFA Enabled", "Created At", "Last Login"];
    const rows = filteredUsers.map((u) => [
      u.uid,
      `"${u.name}"`,
      u.email,
      u.role,
      u.status || "active",
      u.mfaEnabled ? "TRUE" : "FALSE",
      u.createdAt || "",
      u.lastLogin || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const link = document.createElement("a");
    link.href = encodeURI(csvContent);
    link.download = `gridguard_members_${Date.now()}.csv`;
    link.click();
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
            <Users className="text-amber-400" />
            Member Access Directory
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-400">
            Realtime Database authentication states, privilege roles, and active presence monitoring.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={exportMembersCsv}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3.5 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700 hover:text-white transition active:scale-95"
          >
            <HardDrive size={14} />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-4 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 active:scale-95"
          >
            <UserPlus size={15} />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-800 bg-[#0B1628]/80 py-2.5 pl-10 pr-4 text-xs text-slate-200 placeholder:text-slate-500 outline-none transition focus:border-amber-400"
          />
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-[#0B1628]/80 py-2.5 px-3.5 text-xs text-slate-200 outline-none transition focus:border-amber-400 cursor-pointer"
        >
          <option value="ALL">All Roles</option>
          <option value="admin">Administrator Only</option>
          <option value="member">Members Only</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-800 bg-[#0B1628]/80 py-2.5 px-3.5 text-xs text-slate-200 outline-none transition focus:border-amber-400 cursor-pointer"
        >
          <option value="ALL">All Statuses</option>
          <option value="active">Active Only</option>
          <option value="disabled">Disabled Only</option>
        </select>
      </div>

      {/* Members Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 shadow-xl">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-[#07111F]/90 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            <tr>
              <th className="py-3.5 px-4">Operator</th>
              <th className="py-3.5 px-4">Role</th>
              <th className="py-3.5 px-4">Presence</th>
              <th className="py-3.5 px-4">Status</th>
              <th className="py-3.5 px-4">MFA State</th>
              <th className="py-3.5 px-4">Created Date</th>
              <th className="py-3.5 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-8 text-center text-slate-500 font-sans">
                  No members matched your search filter.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => {
                const isOnline = presenceMap[u.uid]?.online === true;
                return (
                  <tr key={u.uid} className="hover:bg-slate-800/40 transition">
                    <td className="py-3.5 px-4 font-sans font-medium text-white flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800 text-amber-400 font-bold text-sm">
                        {u.name?.charAt(0) || "U"}
                      </div>
                      <div>
                        <p className="font-semibold text-white">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                      </div>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.role === "admin" ? (
                        <span className="inline-flex items-center gap-1 rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                          <Shield size={10} />
                          ADMIN
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                          MEMBER
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      {isOnline ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
                          ONLINE
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">OFFLINE</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          u.status === "disabled"
                            ? "bg-red-500/10 text-red-400 border border-red-500/30"
                            : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                        }`}
                      >
                        {u.status || "active"}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {u.mfaEnabled ? (
                        <span className="rounded bg-lime-400/10 px-2 py-0.5 text-[10px] font-bold text-lime-400 border border-lime-400/20">
                          ENABLED
                        </span>
                      ) : (
                        <span className="text-slate-500 text-[11px]">Disabled</span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 text-[11px]">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5 font-sans">
                        <button
                          onClick={() => handleOpenEmailModal(u.email)}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
                          title="Send Email"
                        >
                          <Mail size={15} />
                        </button>

                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`rounded-lg p-1.5 transition ${
                            u.status === "disabled"
                              ? "text-emerald-400 hover:bg-emerald-500/10"
                              : "text-amber-400 hover:bg-amber-500/10"
                          }`}
                          title={u.status === "disabled" ? "Enable Account" : "Disable Account"}
                        >
                          {u.status === "disabled" ? <CheckCircle size={15} /> : <XCircle size={15} />}
                        </button>

                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10 transition"
                          title="Delete Account"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ADD MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0B1628] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <UserPlus className="text-amber-400" size={20} />
                <h3 className="text-lg font-bold text-white">Add New Operator Member</h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sriram Kanuri"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  placeholder="operator@gridguard.io"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Assigned Role
                  </label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Account Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value as UserAccountStatus)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400 cursor-pointer"
                  >
                    <option value="active">Active</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
              </div>

              {addMsg && (
                <div className={`p-3 rounded-xl text-xs font-medium ${addMsg.includes("success") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {addMsg}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={addLoading}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 disabled:opacity-50"
                >
                  {addLoading ? "Provisioning..." : "Provision Member & Send Invite"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SEND EMAIL MODAL */}
      {showEmailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/30 bg-[#0B1628] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <Mail className="text-amber-400" size={20} />
                <h3 className="text-lg font-bold text-white">Send Email to Member</h3>
              </div>
              <button
                onClick={() => setShowEmailModal(false)}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Recipient
                </label>
                <input
                  type="email"
                  disabled
                  value={selectedUserEmail}
                  className="w-full rounded-xl border border-slate-800 bg-slate-900/80 px-4 py-2 text-xs text-slate-400 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Scheduled Inverter Maintenance Notice"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Message Body *
                </label>
                <textarea
                  required
                  rows={5}
                  placeholder="Write your message here..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/80 p-3 text-xs text-white outline-none focus:border-amber-400"
                />
              </div>

              {emailStatus && (
                <div className={`p-3 rounded-xl text-xs font-medium ${emailStatus.includes("success") ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"}`}>
                  {emailStatus}
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEmailModal(false)}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={emailLoading}
                  className="flex items-center gap-1.5 rounded-xl bg-amber-400 px-5 py-2.5 text-xs font-bold text-slate-950 hover:bg-amber-300 transition shadow-lg shadow-amber-400/20 disabled:opacity-50"
                >
                  <Send size={13} />
                  <span>{emailLoading ? "Sending..." : "Send Email"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
