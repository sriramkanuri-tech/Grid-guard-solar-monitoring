import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import {
  Users,
  UserPlus,
  Mail,
  Shield,
  ShieldAlert,
  ShieldCheck,
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
import { apiClient } from "../../services/apiClient";
import { isConfiguredAdminEmail, getStoredUser } from "../../firebase/auth";
import type { UserProfile, UserRole, UserAccountStatus } from "../../types/user";

export default function AdminMembers() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => getStoredUser());
  const isPrimaryAdmin = currentUser?.email?.trim().toLowerCase() === "sriramkanuri4@gmail.com";

  const [users, setUsers] = useState<UserProfile[]>(() => {
    const cached = localStorage.getItem("gridguard_cache_users");
    return cached ? JSON.parse(cached) : [];
  });
  const [presenceMap, setPresenceMap] = useState<Record<string, { online: boolean }>>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [selectedUserEmail, setSelectedUserEmail] = useState("");

  // Promote Member to Admin State (Exclusively for sriramkanuri4@gmail.com)
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [memberToPromote, setMemberToPromote] = useState<UserProfile | null>(null);
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [promoteMsg, setPromoteMsg] = useState("");

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
    const stored = getStoredUser();
    if (stored) setCurrentUser(stored);

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
    const isOwner = isConfiguredAdminEmail(cleanEmail);
    // Only primary admin can assign admin role to new accounts
    const assignedRole: UserRole = (isPrimaryAdmin && newRole === "admin") || isOwner ? "admin" : "member";
    const isAdmin = assignedRole === "admin";
    const uid = isOwner ? "admin-root-01" : "usr_" + cleanEmail.replace(/[^a-zA-Z0-9]/g, "_");

    const newProfile: UserProfile = {
      uid,
      name: newName.trim(),
      email: cleanEmail,
      role: assignedRole,
      status: newStatus,
      isAdmin,
      mfaEnabled: false,
      createdAt: new Date().toISOString(),
      lastLogin: "Never",
      lastSeen: new Date().toISOString(),
    };

    try {
      await rtdbService.saveUserProfile(uid, newProfile);
      await rtdbService.logAuditEvent("ADMIN_CREATE_MEMBER", cleanEmail, { role: assignedRole, status: newStatus });

      // Optimistically update local users state immediately
      setUsers((prev) => [...prev.filter((u) => u.uid !== uid), newProfile]);

      const htmlOnboarding = isAdmin
        ? `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #022c22 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
              <span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-weight: 800; font-size: 11px; padding: 5px 12px; border-radius: 9999px; letter-spacing: 0.15em; text-transform: uppercase; font-family: monospace;">
                Security Privilege Upgrade
              </span>
              <h1 style="margin: 16px 0 6px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
                You are now an Administrator
              </h1>
              <p style="margin: 0; color: #94a3b8; font-size: 13px;">
                Grid Guard Solar Monitoring &amp; Microgrid Protection Platform
              </p>
            </div>
            <div style="padding: 28px 24px;">
              <p style="color: #e2e8f0; font-size: 15px; margin-top: 0; line-height: 1.6;">
                Hello <strong>${newName}</strong>,
              </p>
              <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
                You have been registered with <strong>Administrator privileges</strong> on Grid Guard Solar Monitoring platform by the primary system administrator (<strong>sriramkanuri4@gmail.com</strong>).
              </p>
              <div style="background: #090e17; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px;">
                  <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace;">Designated Role</span>
                  <span style="background: #fbbf24; color: #020617; font-weight: 800; font-size: 12px; padding: 3px 10px; border-radius: 6px; font-family: monospace;">ADMINISTRATOR</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace;">Account Email</span>
                  <span style="color: #38bdf8; font-weight: 600; font-size: 13px; font-family: monospace;">${cleanEmail}</span>
                </div>
              </div>
              <div style="text-align: center; margin: 32px 0 20px 0;">
                <a href="https://gridguardsolarmonitoring.web.app/admin/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #020617; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; letter-spacing: 0.025em; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);">
                  Launch Administrator Console
                </a>
              </div>
            </div>
            <div style="background: #090e17; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
              Grid Guard Microgrid Operations &bull; https://gridguardsolarmonitoring.web.app
            </div>
          </div>`
        : `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 540px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 12px; border: 1px solid #1e293b; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e3a8a 0%, #0284c7 100%); padding: 24px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 20px; font-weight: 800;">Welcome to Grid Guard</h1>
              <p style="margin: 4px 0 0 0; color: #bae6fd; font-size: 13px;">Solar Monitoring &amp; Protection Platform</p>
            </div>
            <div style="padding: 24px;">
              <p style="color: #cbd5e1; font-size: 14px; margin-top: 0;">Hello <strong>${newName}</strong>,</p>
              <p style="color: #cbd5e1; font-size: 14px;">Your operator account on Grid Guard Solar Monitoring has been provisioned with the role of <strong>${assignedRole.toUpperCase()}</strong>.</p>
              <div style="background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0;">
                <div style="color: #94a3b8; font-size: 12px; margin-bottom: 4px;">Registered Email</div>
                <div style="color: #38bdf8; font-weight: bold; font-size: 15px;">${cleanEmail}</div>
                <div style="color: #94a3b8; font-size: 12px; margin-top: 12px; margin-bottom: 4px;">Account Status</div>
                <div style="color: #4ade80; font-weight: bold; font-size: 13px; text-transform: uppercase;">Active</div>
              </div>
              <div style="text-align: center; margin: 24px 0;">
                <a href="https://gridguardsolarmonitoring.web.app/login" style="display: inline-block; background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: bold; font-size: 14px;">Sign In to Grid Guard</a>
              </div>
              <p style="color: #64748b; font-size: 12px; margin-bottom: 0;">If you did not expect this invitation, please contact your system administrator at sriramkanuri45@gmail.com.</p>
            </div>
            <div style="background: #0f172a; padding: 14px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
              Grid Guard Solar Operations &bull; https://gridguardsolarmonitoring.web.app
            </div>
          </div>`;

      // Dispatch onboarding email asynchronously (non-blocking)
      apiClient.sendEmail({
        recipients: [cleanEmail],
        subject: isAdmin ? "🛡️ Grid Guard Notice: You are now an Administrator" : "Welcome to Grid Guard Solar Monitoring Platform",
        message: isAdmin
          ? `Hello ${newName},\n\nYou have been designated as an Administrator on Grid Guard Solar Monitoring Platform by the primary system administrator (sriramkanuri4@gmail.com).\n\nRole: ADMINISTRATOR\nAccount: ${cleanEmail}\n\nAccess Admin Console: https://gridguardsolarmonitoring.web.app/admin/dashboard\n\nBest regards,\nGrid Guard Operations`
          : `Hello ${newName},\n\nYour operator account on Grid Guard Solar Monitoring has been provisioned with the role of [${assignedRole.toUpperCase()}].\n\nYou can sign in to the platform using your email: ${cleanEmail}.\n\nAccess the portal: https://gridguardsolarmonitoring.web.app\n\nDirect Login: https://gridguardsolarmonitoring.web.app/login\n\nBest regards,\nGrid Guard Operations Team`,
        html_message: htmlOnboarding,
      }).catch((emailErr) => {
        console.warn("[Onboarding Email Notice] Dispatch deferred:", emailErr);
      });

      setAddMsg("Member added successfully and registered in Firebase RTDB!");
      setTimeout(() => {
        setShowAddModal(false);
        setNewName("");
        setNewEmail("");
        setNewRole("member");
        setAddMsg("");
      }, 1200);
    } catch (err: unknown) {
      setAddMsg(err instanceof Error ? err.message : "Failed to create member.");
    } finally {
      setAddLoading(false);
    }
  };

  const handleOpenPromoteModal = (user: UserProfile) => {
    if (!isPrimaryAdmin) {
      alert("Security Alert: Only primary administrator (sriramkanuri4@gmail.com) is authorized to promote members to Administrator.");
      return;
    }
    setMemberToPromote(user);
    setPromoteMsg("");
    setShowPromoteModal(true);
  };

  const handlePromoteToAdmin = async () => {
    if (!memberToPromote || !isPrimaryAdmin) return;
    setPromoteLoading(true);
    setPromoteMsg("");

    const targetEmail = memberToPromote.email.trim().toLowerCase();
    const targetName = memberToPromote.name || targetEmail.split("@")[0];

    try {
      // 1. Update user profile in PostgreSQL database
      const updatedProfile: UserProfile = {
        ...memberToPromote,
        role: "admin",
        isAdmin: true,
        lastSeen: new Date().toISOString(),
      };
      await rtdbService.saveUserProfile(memberToPromote.uid, updatedProfile);
      await rtdbService.setUserRole(memberToPromote.uid, "admin", targetEmail);

      // 2. Optimistically update local users state
      setUsers((prev) =>
        prev.map((u) => (u.uid === memberToPromote.uid || u.email.toLowerCase() === targetEmail ? { ...u, role: "admin", isAdmin: true } : u))
      );

      // 3. Log audit event
      await rtdbService.logAuditEvent(
        "ADMIN_PROMOTED_MEMBER",
        targetEmail,
        {
          promotedBy: "sriramkanuri4@gmail.com",
          previousRole: memberToPromote.role,
          newRole: "admin",
        },
        currentUser?.uid || "admin-root-01",
        "sriramkanuri4@gmail.com"
      );

      // 4. Construct professional notification HTML email stating they are now an administrator
      const htmlEmail = `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #030712; color: #f8fafc; border-radius: 16px; border: 1px solid #1e293b; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);">
        <div style="background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 50%, #022c22 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #334155;">
          <span style="background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); font-weight: 800; font-size: 11px; padding: 5px 12px; border-radius: 9999px; letter-spacing: 0.15em; text-transform: uppercase; font-family: monospace;">
            Security Privilege Upgrade
          </span>
          <h1 style="margin: 16px 0 6px 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">
            You are now an Administrator
          </h1>
          <p style="margin: 0; color: #94a3b8; font-size: 13px;">
            Grid Guard Solar Monitoring &amp; Microgrid Protection Platform
          </p>
        </div>

        <div style="padding: 28px 24px;">
          <p style="color: #e2e8f0; font-size: 15px; margin-top: 0; line-height: 1.6;">
            Hello <strong>${targetName}</strong>,
          </p>
          <p style="color: #cbd5e1; font-size: 14px; line-height: 1.6;">
            You have been officially promoted to <strong>Administrator</strong> on the Grid Guard Solar Monitoring Platform by the primary administrator (<strong>sriramkanuri4@gmail.com</strong>).
          </p>

          <div style="background: #090e17; border: 1px solid #1e293b; border-radius: 12px; padding: 20px; margin: 24px 0;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace;">Designated Role</span>
              <span style="background: #fbbf24; color: #020617; font-weight: 800; font-size: 12px; padding: 3px 10px; border-radius: 6px; font-family: monospace;">ADMINISTRATOR</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1e293b; padding-bottom: 12px; margin-bottom: 12px;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace;">Account Email</span>
              <span style="color: #38bdf8; font-weight: 600; font-size: 13px; font-family: monospace;">${targetEmail}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: #94a3b8; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; font-family: monospace;">Promoted By</span>
              <span style="color: #a3e635; font-weight: 600; font-size: 13px; font-family: monospace;">sriramkanuri4@gmail.com</span>
            </div>
          </div>

          <div style="background: rgba(15, 23, 42, 0.6); border: 1px solid #1e293b; border-radius: 12px; padding: 16px 20px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #f8fafc; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
              Your Elevated Capabilities:
            </h4>
            <ul style="margin: 0; padding-left: 20px; color: #94a3b8; font-size: 13px; line-height: 1.8;">
              <li>Full Administrative Console &amp; System Health diagnostics</li>
              <li>Microgrid Inverter breaker relay control &amp; grid islanding</li>
              <li>Real-time telemetry calibration &amp; threshold adjustments</li>
              <li>24/7 Isolation Forest machine learning anomaly alert management</li>
              <li>Operator member roster review and audit log inspections</li>
            </ul>
          </div>

          <div style="text-align: center; margin: 32px 0 20px 0;">
            <a href="https://gridguardsolarmonitoring.web.app/admin/dashboard" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #020617; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 800; font-size: 14px; letter-spacing: 0.025em; box-shadow: 0 10px 25px -5px rgba(245, 158, 11, 0.4);">
              Launch Administrator Console
            </a>
          </div>

          <p style="color: #64748b; font-size: 12px; line-height: 1.5; margin-top: 24px; text-align: center;">
            Direct portal login: <a href="https://gridguardsolarmonitoring.web.app/login" style="color: #38bdf8; text-decoration: none;">https://gridguardsolarmonitoring.web.app/login</a>
          </p>
        </div>

        <div style="background: #090e17; padding: 16px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
          Grid Guard Microgrid Solar Operations &bull; Automated System Authorization
        </div>
      </div>`;

      const textEmail = `Hello ${targetName},\n\nYou have been officially promoted to Administrator on the Grid Guard Solar Monitoring Platform by the primary system administrator (sriramkanuri4@gmail.com).\n\nRole: ADMINISTRATOR\nAccount: ${targetEmail}\nPromoted By: sriramkanuri4@gmail.com\n\nYour elevated capabilities:\n- Full Administrative Console & System Health diagnostics\n- Microgrid Inverter breaker relay control & grid islanding\n- Real-time telemetry calibration & threshold adjustments\n- 24/7 Isolation Forest ML anomaly alerts\n- Operator member roster management\n\nAccess your Admin Console: https://gridguardsolarmonitoring.web.app/admin/dashboard\nPortal Login: https://gridguardsolarmonitoring.web.app/login\n\nBest regards,\nGrid Guard Security & Operations\nsriramkanuri4@gmail.com`;

      await apiClient.sendEmail({
        recipients: [targetEmail],
        subject: "🛡️ Grid Guard Notice: You are now an Administrator",
        message: textEmail,
        html_message: htmlEmail,
      });

      setPromoteMsg("Success: Member promoted to Administrator and notification email dispatched!");
      setTimeout(() => {
        setShowPromoteModal(false);
        setMemberToPromote(null);
        setPromoteMsg("");
      }, 1800);
    } catch (err: unknown) {
      setPromoteMsg(err instanceof Error ? err.message : "Failed to promote operator.");
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleDemoteToMember = async (user: UserProfile) => {
    if (!isPrimaryAdmin) return;
    if (user.email.toLowerCase() === "sriramkanuri4@gmail.com") {
      alert("Primary administrator account cannot be demoted.");
      return;
    }
    if (!window.confirm(`Revoke administrator privileges for ${user.name} (${user.email})?`)) return;

    try {
      const updatedProfile: UserProfile = {
        ...user,
        role: "member",
        isAdmin: false,
        lastSeen: new Date().toISOString(),
      };
      await rtdbService.saveUserProfile(user.uid, updatedProfile);
      await rtdbService.setUserRole(user.uid, "member", user.email);
      setUsers((prev) =>
        prev.map((u) => (u.uid === user.uid || u.email.toLowerCase() === user.email.toLowerCase() ? { ...u, role: "member", isAdmin: false } : u))
      );
      await rtdbService.logAuditEvent(
        "ADMIN_REVOKED_PRIVILEGES",
        user.email,
        { revokedBy: "sriramkanuri4@gmail.com", newRole: "member" },
        currentUser?.uid || "admin-root-01",
        "sriramkanuri4@gmail.com"
      );
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to revoke admin privileges.");
    }
  };

  const handleToggleStatus = async (user: UserProfile) => {
    const newStatus: UserAccountStatus = user.status === "disabled" ? "active" : "disabled";
    setUsers((prev) => prev.map((u) => (u.uid === user.uid || u.email.toLowerCase() === user.email.toLowerCase() ? { ...u, status: newStatus } : u)));
    await rtdbService.setUserStatus(user.uid, newStatus, user.email);
    await rtdbService.saveUserProfile(user.uid, { ...user, status: newStatus });
    await rtdbService.logAuditEvent(
      newStatus === "disabled" ? "DISABLE_MEMBER" : "ENABLE_MEMBER",
      user.email,
      { previousStatus: user.status }
    );
  };

  const handleDeleteUser = async (user: UserProfile) => {
    if (window.confirm(`Are you sure you want to permanently delete operator ${user.name} (${user.email})?`)) {
      setUsers((prev) => prev.filter((u) => u.uid !== user.uid && u.email.toLowerCase() !== user.email.toLowerCase()));
      await rtdbService.deleteUser(user.uid, user.email);
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
      await apiClient.sendEmail({
        recipients: [selectedUserEmail],
        subject: emailSubject,
        message: emailMessage,
      });

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
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `gridguard_members_${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
            PostgreSQL 18 authentication states, privilege roles, and active presence monitoring.
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
                        {/* Make Admin Option - Authorized Exclusively for sriramkanuri4@gmail.com */}
                        {isPrimaryAdmin && u.email.toLowerCase() !== "sriramkanuri4@gmail.com" && (
                          u.role !== "admin" ? (
                            <button
                              onClick={() => handleOpenPromoteModal(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-300 hover:bg-amber-400/20 hover:border-amber-400 transition shadow-xs active:scale-95"
                              title={`Promote ${u.name} to Administrator`}
                            >
                              <ShieldCheck size={13} className="text-amber-400" />
                              <span>Make Admin</span>
                            </button>
                          ) : (
                            <button
                              onClick={() => handleDemoteToMember(u)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2 py-1 text-[10px] font-medium text-slate-400 hover:text-rose-400 hover:border-rose-500/30 transition"
                              title="Revoke Admin Access"
                            >
                              <span>Demote</span>
                            </button>
                          )
                        )}

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
                  placeholder="operator@gmail.com"
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
                  {isPrimaryAdmin ? (
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as UserRole)}
                      className="w-full rounded-xl border border-slate-700 bg-slate-950/80 px-3 py-2.5 text-xs text-white outline-none focus:border-amber-400 cursor-pointer"
                    >
                      <option value="member">Member (Operator)</option>
                      <option value="admin">Administrator (Full Access)</option>
                    </select>
                  ) : (
                    <input
                      type="text"
                      readOnly
                      value="Member (Operator)"
                      className="w-full rounded-xl border border-slate-700 bg-slate-900/60 px-3 py-2.5 text-xs text-slate-300 outline-none cursor-not-allowed"
                    />
                  )}
                  <p className="mt-1 text-[10px] text-slate-500">
                    {isPrimaryAdmin
                      ? "Admin assignment enabled for sriramkanuri4@gmail.com"
                      : "Administrator role is restricted to sriramkanuri4@gmail.com"}
                  </p>
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

      {/* PROMOTE TO ADMIN CONFIRMATION MODAL */}
      {showPromoteModal && memberToPromote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
          <div className="w-full max-w-lg rounded-3xl border border-amber-500/40 bg-[#0B1628] p-6 sm:p-8 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-400 font-bold">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Promote to Administrator</h3>
                  <p className="text-[11px] text-amber-400 font-mono">
                    Authorized exclusively by sriramkanuri4@gmail.com
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowPromoteModal(false);
                  setMemberToPromote(null);
                  setPromoteMsg("");
                }}
                className="text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-[#07111F] p-4 space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Selected Operator:</span>
                  <span className="font-semibold text-white">{memberToPromote.name}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Account Email:</span>
                  <span className="font-mono text-cyan-400">{memberToPromote.email}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Current Role:</span>
                  <span className="font-mono uppercase text-slate-300">{memberToPromote.role}</span>
                </div>
                <div className="flex justify-between items-center text-xs pt-2 border-t border-slate-800/80">
                  <span className="text-slate-400">New Privilege Level:</span>
                  <span className="font-mono font-black text-amber-400 uppercase flex items-center gap-1">
                    <Shield size={13} />
                    ADMINISTRATOR (FULL ACCESS)
                  </span>
                </div>
              </div>

              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5 text-xs text-slate-300 space-y-1.5">
                <p className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <ShieldAlert size={14} />
                  Administrator Promotion &amp; Notification Protocol
                </p>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Promoting <strong className="text-white">{memberToPromote.email}</strong> grants them full administrative controls across Grid Guard. An official notification email stating <span className="text-amber-300 font-semibold">"You are now an Administrator"</span> will be automatically dispatched to their email address via Gmail SMTP.
                </p>
              </div>

              {promoteMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-medium flex items-center gap-2 ${
                    promoteMsg.includes("Success") || promoteMsg.includes("success")
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}
                >
                  <CheckCircle size={15} className="shrink-0" />
                  <span>{promoteMsg}</span>
                </div>
              )}

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setShowPromoteModal(false);
                    setMemberToPromote(null);
                    setPromoteMsg("");
                  }}
                  className="rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700 transition"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handlePromoteToAdmin}
                  disabled={promoteLoading}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 px-5 py-2.5 text-xs font-bold text-slate-950 hover:from-amber-300 hover:to-amber-400 transition shadow-lg shadow-amber-500/20 disabled:opacity-50"
                >
                  {promoteLoading ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Promoting &amp; Dispatching Email...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck size={15} />
                      <span>Confirm &amp; Promote to Admin</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
