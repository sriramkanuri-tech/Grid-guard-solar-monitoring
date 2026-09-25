import { useState, useEffect } from "react";
import {
  Mail,
  Send,
  Users,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
  CheckSquare,
  Square,
  Sparkles,
  ShieldAlert,
  Info,
} from "lucide-react";
import { rtdbService } from "../../firebase/database";
import { getStoredUser } from "../../firebase/auth";
import { apiClient } from "../../services/apiClient";
import type { UserProfile } from "../../types/user";

const EMAIL_TEMPLATES = [
  {
    id: "maintenance",
    name: "System Maintenance Advisory",
    subject: "Scheduled Grid Guard Platform Maintenance Notice",
    message: `Dear Grid Guard Operator,

Please be advised that the Grid Guard Solar Platform will undergo scheduled maintenance to optimize telemetry ingest pipelines and telemetry ML anomaly models.

Date: Tomorrow, 02:00 UTC - 04:00 UTC
Expected Impact: Minimal. Sensor data will be cached locally on nodes and flushed upon reconnection.

For urgent inquiries, contact sriramkanuri4@gmail.com.

Grid Guard Solar Operations`,
  },
  {
    id: "security",
    name: "Security & MFA Enforcement",
    subject: "Action Required: Enable Two-Factor Authentication (MFA)",
    message: `Dear Operator,

In accordance with our platform security protocols, all operators monitoring solar microgrids must enable Two-Factor Authentication (TOTP) under your Account Settings.

Please log in to your dashboard at your earliest convenience to link your Google Authenticator or Authy app.

Stay secure,
Grid Guard Security Team`,
  },
  {
    id: "anomaly",
    name: "Grid High-Voltage Anomaly Alert",
    subject: "CRITICAL: Microgrid Voltage Excursion Detected",
    message: `PRIORITY GRID ADVISORY:

An abnormal telemetry condition has been detected on Node GG-NODE-01 by the Isolation Forest ML inference engine.
- Telemetry condition: Inverter AC Overvoltage excursion > 250V
- Action: Inspect the substation inverter breaker immediately.

Live control room: https://gridguardsolarmonitoring.web.app/admin/alerts`,
  },
];

export default function AdminEmails() {
  const currentUser = getStoredUser();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [search, setSearch] = useState("");

  // Email form state
  const [recipientMode, setRecipientMode] = useState<"all" | "admin" | "custom" | "direct">("direct");
  const [directEmail, setDirectEmail] = useState("sriramkanuri4@gmail.com");
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [resultStatus, setResultStatus] = useState<{
    type: "success" | "error";
    message: string;
    details?: string[];
  } | null>(null);

  useEffect(() => {
    const unsub = rtdbService.subscribeToUsers((userList) => {
      setUsers(userList);
      setLoadingUsers(false);
    });
    return () => unsub();
  }, []);

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.name && u.name.toLowerCase().includes(q)) ||
      (u.email && u.email.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q))
    );
  });

  const toggleSelectEmail = (email: string) => {
    setSelectedEmails((prev) =>
      prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]
    );
  };

  const selectAllFiltered = () => {
    const validEmails = filteredUsers.map((u) => u.email).filter(Boolean);
    const allSelected = validEmails.every((e) => selectedEmails.includes(e));
    if (allSelected) {
      setSelectedEmails((prev) => prev.filter((e) => !validEmails.includes(e)));
    } else {
      setSelectedEmails((prev) => Array.from(new Set([...prev, ...validEmails])));
    }
  };

  const applyTemplate = (tmpl: (typeof EMAIL_TEMPLATES)[0]) => {
    setSubject(tmpl.subject);
    setMessage(tmpl.message);
  };

  const calculateTargetEmails = (): string[] => {
    if (recipientMode === "direct") {
      const clean = directEmail.trim().toLowerCase();
      return clean && clean.includes("@") ? [clean] : [];
    }
    if (recipientMode === "all") {
      return Array.from(new Set(users.map((u) => u.email).filter(Boolean)));
    }
    if (recipientMode === "admin") {
      return Array.from(
        new Set(
          users
            .filter((u) => u.role === "admin" || u.email === "sriramkanuri4@gmail.com")
            .map((u) => u.email)
            .filter(Boolean)
        )
      );
    }
    return selectedEmails;
  };

  const handleSendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setResultStatus(null);

    const targets = calculateTargetEmails();
    if (targets.length === 0) {
      setResultStatus({
        type: "error",
        message: "No recipient emails selected. Please choose at least one valid recipient.",
      });
      return;
    }

    if (!subject.trim() || !message.trim()) {
      setResultStatus({
        type: "error",
        message: "Subject and Message body cannot be empty.",
      });
      return;
    }

    setSending(true);

    try {
      await apiClient.sendEmail({
        recipients: targets,
        subject: subject.trim(),
        message: message.trim(),
      });

      // Log to RTDB Audit Trail
      await rtdbService.logAuditEvent(
        "EMAIL_DISPATCHED",
        `${targets.length} recipients`,
        { subject, recipientCount: targets.length },
        currentUser?.uid,
        currentUser?.email
      );

      setResultStatus({
        type: "success",
        message: `Dispatched successfully to ${targets.length} recipient${
          targets.length === 1 ? "" : "s"
        } via Gmail SMTP!`,
        details: targets,
      });

      // Clear or retain form based on user convenience
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "SMTP dispatch failure.";
      setResultStatus({
        type: "error",
        message: msg,
      });
    } finally {
      setSending(false);
    }
  };

  const targetCount = calculateTargetEmails().length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
              COMMUNICATIONS CENTER
            </span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white mt-1">
            Email & Notification Dispatcher
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Broadcast platform bulletins, operational advisories, or security notices via Gmail SMTP.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-mono text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>SMTP Service: ONLINE</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Form Left, Recipient Selector / Templates Right */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Email Composer Form */}
        <div className="lg:col-span-7 space-y-6">
          <form
            onSubmit={handleSendEmail}
            className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-6 shadow-xl space-y-5"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Mail className="h-4 w-4 text-amber-400" />
                <span>Compose Transmission</span>
              </h2>
              <span className="text-[11px] font-mono text-slate-400">
                Targeting: <strong className="text-amber-400">{targetCount}</strong> recipient(s)
              </span>
            </div>

            {/* Recipient Target Radio */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-300">Audience Scope</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setRecipientMode("direct")}
                  className={`rounded-xl border p-2.5 text-xs font-medium transition text-center ${
                    recipientMode === "direct"
                      ? "border-amber-400 bg-amber-400/15 text-amber-300 font-bold shadow-sm shadow-amber-400/10"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  Direct Gmail
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode("all")}
                  className={`rounded-xl border p-2.5 text-xs font-medium transition text-center ${
                    recipientMode === "all"
                      ? "border-amber-400 bg-amber-400/15 text-amber-300 font-bold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  All Members ({users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode("admin")}
                  className={`rounded-xl border p-2.5 text-xs font-medium transition text-center ${
                    recipientMode === "admin"
                      ? "border-amber-400 bg-amber-400/15 text-amber-300 font-bold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  Admins Only
                </button>
                <button
                  type="button"
                  onClick={() => setRecipientMode("custom")}
                  className={`rounded-xl border p-2.5 text-xs font-medium transition text-center ${
                    recipientMode === "custom"
                      ? "border-amber-400 bg-amber-400/15 text-amber-300 font-bold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  Custom List ({selectedEmails.length})
                </button>
              </div>

              {/* Direct Gmail Input Field */}
              {recipientMode === "direct" && (
                <div className="mt-3 rounded-xl border border-amber-400/40 bg-amber-400/10 p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Mail size={14} className="text-amber-400" />
                      <span>Destination Gmail Address</span>
                    </label>
                    <span className="text-[10px] font-mono text-amber-400/80 uppercase">
                      Single Transmission
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={directEmail}
                      onChange={(e) => setDirectEmail(e.target.value)}
                      placeholder="e.g., sriramkanuri4@gmail.com"
                      className="w-full rounded-xl border border-amber-400/50 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400/40"
                    />
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300">
                    <span>Email will be delivered directly to this address.</span>
                    <button
                      type="button"
                      onClick={() => setDirectEmail("sriramkanuri4@gmail.com")}
                      className="text-amber-400 hover:underline font-mono text-[10px]"
                    >
                      Use sriramkanuri4@gmail.com
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Subject</label>
              <input
                type="text"
                required
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Scheduled Inverter Maintenance Notice"
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* Message Body */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Message Body</label>
              <textarea
                required
                rows={9}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Write your email announcement or select a quick template from the right..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none font-mono leading-relaxed"
              />
            </div>

            {/* Status Alert */}
            {resultStatus && (
              <div
                className={`rounded-xl border p-3.5 text-xs flex items-start gap-3 ${
                  resultStatus.type === "success"
                    ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                    : "border-rose-500/30 bg-rose-500/10 text-rose-300"
                }`}
              >
                {resultStatus.type === "success" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-5 w-5 shrink-0 text-rose-400 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">{resultStatus.message}</p>
                  {resultStatus.details && (
                    <p className="mt-1 text-[11px] text-slate-300 opacity-90 line-clamp-2">
                      Recipients: {resultStatus.details.join(", ")}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
                <Info size={13} className="text-amber-400" />
                <span>Authenticated via Grid Guard Gmail Relay</span>
              </div>

              <button
                type="submit"
                disabled={sending || targetCount === 0}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-slate-950 transition hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/20 active:scale-95"
              >
                {sending ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    <span>Transmitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    <span>Send Broadcast</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column: Templates + Custom Selector */}
        <div className="lg:col-span-5 space-y-6">
          {/* Quick Templates */}
          <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider border-b border-slate-800 pb-2.5">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span>Standard Operations Templates</span>
            </div>

            <div className="space-y-2">
              {EMAIL_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => applyTemplate(tmpl)}
                  className="w-full text-left rounded-xl border border-slate-800 bg-slate-900/60 p-3 hover:border-amber-500/50 hover:bg-slate-800/60 transition group"
                >
                  <p className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                    {tmpl.name}
                  </p>
                  <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{tmpl.subject}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Recipient Picker (Visible when custom mode selected) */}
          <div className="rounded-2xl border border-slate-800 bg-[#070F1E]/80 backdrop-blur-xl p-5 shadow-xl space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-white font-bold text-xs uppercase tracking-wider">
                <Users className="h-4 w-4 text-amber-400" />
                <span>Recipient Directory</span>
              </div>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-[11px] font-mono text-amber-400 hover:underline"
              >
                Select / Clear Filtered
              </button>
            </div>

            {/* Filter Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search member email or name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-amber-400 focus:outline-none"
              />
            </div>

            {/* List */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-800/40">
              {loadingUsers ? (
                <div className="py-6 text-center text-xs text-slate-500">Loading directory...</div>
              ) : filteredUsers.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-500">No members found.</div>
              ) : (
                filteredUsers.map((u) => {
                  const isChecked = selectedEmails.includes(u.email);
                  return (
                    <div
                      key={u.uid}
                      onClick={() => toggleSelectEmail(u.email)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition ${
                        isChecked ? "bg-amber-400/10 text-white" : "hover:bg-slate-800/40 text-slate-300"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 truncate">
                        {isChecked ? (
                          <CheckSquare className="h-4 w-4 text-amber-400 shrink-0" />
                        ) : (
                          <Square className="h-4 w-4 text-slate-600 shrink-0" />
                        )}
                        <div className="truncate">
                          <p className="text-xs font-medium truncate">{u.name || "Operator"}</p>
                          <p className="text-[10px] font-mono text-slate-400 truncate">{u.email}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[9px] font-mono uppercase px-1.5 py-0.5 rounded ${
                          u.role === "admin"
                            ? "bg-amber-500/20 text-amber-400"
                            : "bg-slate-800 text-slate-400"
                        }`}
                      >
                        {u.role || "member"}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
