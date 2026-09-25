import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import AnimatedPage from "../../components/AnimatedPage";
import PageHeader from "../../components/PageHeader";
import {
  getStoredUser,
  subscribeToAuth,
  updateCurrentUserProfile,
  changeUserPassword,
  logoutUser,
} from "../../firebase/auth";
import { databaseService, type StoredUserCredential } from "../../services/databaseService";
import type { UserProfile } from "../../types/user";
import {
  User,
  Mail,
  Shield,
  Calendar,
  Clock,
  Lock,
  Check,
  LogOut,
  Phone,
  ShieldAlert,
  Database,
  Users,
} from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());
  const [dbUsers, setDbUsers] = useState<StoredUserCredential[]>([]);

  // Edit profile state
  const [name, setName] = useState(user?.name || "Solar Operator");
  const [phone, setPhone] = useState(user?.phone || "");
  const [role, setRole] = useState(user?.role || "Solar Systems Engineer");
  const [profileMsg, setProfileMsg] = useState("");

  // Change password state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");

  useEffect(() => {
    setDbUsers(databaseService.getAllUsers());
    const unsub = subscribeToAuth((u) => {
      if (u) {
        setUser(u);
        setName(u.name);
        setPhone(u.phone || "");
        setRole(u.role);
      }
    });
    return () => unsub();
  }, []);

  const handleUpdateProfile = async (e: FormEvent) => {
    e.preventDefault();
    setProfileMsg("");
    try {
      const updated = await updateCurrentUserProfile(name, phone, role);
      setUser(updated);
      setProfileMsg("Profile updated successfully!");
      setTimeout(() => setProfileMsg(""), 3000);
    } catch {
      setProfileMsg("Failed to update profile.");
    }
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    setPasswordMsg("");
    if (newPassword.length < 6) {
      setPasswordMsg("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordMsg("Passwords do not match.");
      return;
    }
    try {
      await changeUserPassword(newPassword);
      setPasswordMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setPasswordMsg(""), 3000);
    } catch {
      setPasswordMsg("Failed to change password.");
    }
  };

  const handleLogout = async () => {
    await logoutUser();
    navigate("/login");
  };

  const initial = user?.name?.charAt(0).toUpperCase() || "O";
  const createdDate = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "January 15, 2026";

  const lastLoginDate = user?.lastLogin
    ? new Date(user.lastLogin).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "Just now";

  return (
    <AnimatedPage>
      <PageHeader
        title="Account Profile"
        subtitle="Operator identity, authenticated roles, security, and credentials"
        category="Operator Access"
      />

      <div className="grid gap-8 lg:grid-cols-3 max-w-6xl">
        {/* Left Card: Profile Overview */}
        <section className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800/60">
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-lime-400 to-emerald-500 font-bold text-3xl text-slate-950 shadow-xl shadow-lime-400/20 mb-4">
                {initial}
                <span className="absolute -inset-1 -z-10 rounded-2xl bg-lime-400/20 blur-sm" />
              </div>
              <h2 className="text-lg font-bold text-white tracking-tight">{user?.name || "Solar Operator"}</h2>
              {user?.isAdmin && (
                <span className="mt-1.5 inline-flex items-center gap-1.5 rounded-full border border-amber-400/40 bg-amber-400/10 px-3 py-0.5 text-[10px] font-mono font-bold text-amber-300 shadow-sm shadow-amber-400/10">
                  <ShieldAlert size={12} className="text-amber-400" />
                  ADMINISTRATOR ROOT
                </span>
              )}
              <p className="text-xs text-lime-400 font-semibold mt-1 font-mono">{user?.role || "Solar Systems Engineer"}</p>
              <p className="text-xs text-slate-400 mt-1">{user?.email || "admin@gridguard.io"}</p>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <Shield size={16} className={user?.isAdmin ? "text-amber-400 shrink-0" : "text-lime-400 shrink-0"} />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">System Role</span>
                  <span className="text-white font-medium flex items-center gap-2">
                    {user?.role || "Solar Systems Engineer"}
                    {user?.isAdmin && (
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-400/10 px-1.5 py-0.5 rounded border border-amber-400/30">
                        SUPERUSER
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Mail size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Email Address</span>
                  <span className="text-white font-medium">{user?.email || "admin@gridguard.io"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Phone size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Contact Phone</span>
                  <span className="text-white font-medium">{user?.phone || "+91 98765 43210"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Calendar size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Account Established</span>
                  <span className="text-white font-medium">{createdDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Clock size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Last Active Session</span>
                  <span className="text-white font-medium">{lastLoginDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800/80">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 py-3 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white active:scale-95"
            >
              <LogOut size={14} />
              <span>Operator Sign Out</span>
            </button>
          </div>
        </section>

        {/* Right Cards: Edit Profile & Change Password */}
        <div className="lg:col-span-2 space-y-6">
          {/* Edit Profile */}
          <section className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
              <User size={18} />
              <h2 className="font-bold text-white text-base">Edit Profile Information</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Update your display name, contact phone, and operator title.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                  Role Title
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                />
              </div>

              {profileMsg && (
                <div className="flex items-center gap-2 text-xs text-lime-400 font-medium">
                  <Check size={14} />
                  <span>{profileMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="rounded-xl bg-lime-500 px-5 py-2.5 text-xs font-bold text-slate-950 shadow-md shadow-lime-500/20 transition hover:bg-lime-400 active:scale-95"
              >
                Save Profile Changes
              </button>
            </form>
          </section>

          {/* Change Password */}
          <section className="animate-item rounded-2xl border border-slate-800/80 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
            <div className="flex items-center gap-2 text-lime-400 mb-2 border-b border-slate-800/60 pb-3">
              <Lock size={18} />
              <h2 className="font-bold text-white text-base">Change Password</h2>
            </div>
            <p className="text-xs text-slate-400 mb-5">
              Update your account password for secure operator session authentication.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Min 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-2.5 text-xs text-slate-100 outline-none transition focus:border-lime-400 focus:ring-1 focus:ring-lime-400/30"
                  />
                </div>
              </div>

              {passwordMsg && (
                <div
                  className={`text-xs font-medium ${
                    passwordMsg.includes("success") ? "text-lime-400" : "text-red-400"
                  }`}
                >
                  {passwordMsg}
                </div>
              )}

              <button
                type="submit"
                className="rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-700 hover:text-white active:scale-95"
              >
                Update Password
              </button>
            </form>
          </section>
        </div>
      </div>

      {/* Admin-only Database Credentials Directory */}
      {user?.isAdmin && (
        <section className="animate-item mt-8 rounded-2xl border border-amber-500/30 bg-[#0B1628]/80 p-6 shadow-xl backdrop-blur-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400 border border-amber-400/30">
                <Database size={20} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white tracking-wide">
                    Firebase &amp; Database Registered Accounts
                  </h3>
                  <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-mono text-amber-300 border border-amber-400/30">
                    ADMIN AUDIT CONSOLE
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Real-time credentials persisted across Firestore database collection and local storage.
                </p>
              </div>
            </div>
            <div className="text-xs font-mono text-slate-400 self-start sm:self-auto">
              Total Accounts: <span className="font-bold text-amber-300">{dbUsers.length}</span>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-800/80 bg-[#07111F]/70">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-[#0A1628]/90 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                <tr>
                  <th className="py-3 px-4">Operator Name</th>
                  <th className="py-3 px-4">Registered Email</th>
                  <th className="py-3 px-4">Role Title</th>
                  <th className="py-3 px-4">Privilege</th>
                  <th className="py-3 px-4">Phone</th>
                  <th className="py-3 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {dbUsers.map((u) => (
                  <tr key={u.email} className="hover:bg-slate-800/40">
                    <td className="py-3 px-4 font-sans font-medium text-white flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800 text-lime-400 font-bold text-[11px]">
                        {u.name.charAt(0)}
                      </div>
                      <span>{u.name}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-300">{u.email}</td>
                    <td className="py-3 px-4 text-slate-400 font-sans">{u.role}</td>
                    <td className="py-3 px-4">
                      {u.isAdmin ? (
                        <span className="rounded bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold text-amber-300 border border-amber-400/30">
                          ADMIN
                        </span>
                      ) : (
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                          OPERATOR
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-400">{u.phone || "—"}</td>
                    <td className="py-3 px-4 text-right">
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-400">
                        <Check size={10} /> Active in DB
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </AnimatedPage>
  );
}
