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
import type { UserProfile } from "../../types/user";
import { User, Mail, Shield, Calendar, Clock, Lock, Check, LogOut } from "lucide-react";

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<UserProfile | null>(getStoredUser());

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

  const initial = user?.name?.charAt(0).toUpperCase() || "U";
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
        category="Profile"
      />

      <div className="grid gap-8 lg:grid-cols-3 max-w-6xl">
        {/* Left Card: Profile Overview */}
        <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6 lg:col-span-1 flex flex-col justify-between">
          <div>
            <div className="flex flex-col items-center text-center pb-6 border-b border-slate-800">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-lime-400 font-bold text-3xl text-slate-950 shadow-xl shadow-lime-400/20 mb-4">
                {initial}
              </div>
              <h2 className="text-xl font-bold text-white">{user?.name || "Solar Operator"}</h2>
              <p className="text-xs text-lime-400 font-medium mt-1">{user?.role || "Solar Systems Engineer"}</p>
              <p className="text-xs text-slate-500 mt-1">{user?.email || "admin@gridguard.io"}</p>
            </div>

            <div className="mt-6 space-y-4 text-xs">
              <div className="flex items-center gap-3 text-slate-400">
                <Shield size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">System Role</span>
                  <span className="text-white font-medium">{user?.role || "Solar Systems Engineer"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Mail size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Email Address</span>
                  <span className="text-white font-medium">{user?.email || "admin@gridguard.io"}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Calendar size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Account Created</span>
                  <span className="text-white font-medium">{createdDate}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 text-slate-400">
                <Clock size={16} className="text-lime-400 shrink-0" />
                <div>
                  <span className="text-slate-500 block">Last Active Session</span>
                  <span className="text-white font-medium">{lastLoginDate}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-800">
            <button
              onClick={handleLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 py-3 text-xs font-semibold text-red-400 transition hover:bg-red-500 hover:text-white"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </section>

        {/* Right Cards: Edit Profile & Change Password */}
        <div className="lg:col-span-2 space-y-8">
          {/* Edit Profile */}
          <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center gap-2 text-lime-400 mb-2">
              <User size={18} />
              <h2 className="font-semibold text-white text-lg">Edit Profile Information</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Update your display name, contact phone, and operator title.
            </p>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-slate-300">
                  Role Title
                </label>
                <input
                  type="text"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
                />
              </div>

              {profileMsg && (
                <div className="flex items-center gap-2 text-xs text-lime-400">
                  <Check size={14} />
                  <span>{profileMsg}</span>
                </div>
              )}

              <button
                type="submit"
                className="rounded-xl bg-lime-400 px-5 py-2.5 text-xs font-semibold text-slate-950 transition hover:bg-lime-300"
              >
                Save Profile Changes
              </button>
            </form>
          </section>

          {/* Change Password */}
          <section className="animate-item rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <div className="flex items-center gap-2 text-lime-400 mb-2">
              <Lock size={18} />
              <h2 className="font-semibold text-white text-lg">Change Password</h2>
            </div>
            <p className="text-xs text-slate-500 mb-6">
              Update your account password for secure operator access.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    New Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-slate-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950/80 px-4 py-2.5 text-xs text-white outline-none focus:border-lime-400"
                  />
                </div>
              </div>

              {passwordMsg && (
                <div
                  className={`text-xs ${
                    passwordMsg.includes("success") ? "text-lime-400" : "text-red-400"
                  }`}
                >
                  {passwordMsg}
                </div>
              )}

              <button
                type="submit"
                className="rounded-xl border border-lime-400/40 bg-lime-400/10 px-5 py-2.5 text-xs font-semibold text-lime-400 transition hover:bg-lime-400 hover:text-slate-950"
              >
                Update Password
              </button>
            </form>
          </section>
        </div>
      </div>
    </AnimatedPage>
  );
}
