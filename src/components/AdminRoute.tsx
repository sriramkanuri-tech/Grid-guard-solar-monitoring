import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getStoredUser, subscribeToAuth, isConfiguredAdminEmail } from "../firebase/auth";
import type { UserProfile } from "../types/user";

export const AdminRoute: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(() => getStoredUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = subscribeToAuth((u) => {
      setUser(u);
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#030712] text-white">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-ping rounded-full bg-amber-400" />
          <span className="text-sm font-mono text-slate-400">Verifying administrative authorization...</span>
        </div>
      </div>
    );
  }

  // Not authenticated at all
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Check admin role
  const isAdmin = isConfiguredAdminEmail(user.email) || user.role === "admin" || user.isAdmin === true;

  if (!isAdmin) {
    console.warn(`[Access Denied] Non-admin user (${user.email}) attempted to access admin routes.`);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
