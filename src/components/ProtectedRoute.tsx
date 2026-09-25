import React, { useEffect, useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { getStoredUser, subscribeToAuth } from "../firebase/auth";

export const ProtectedRoute: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return Boolean(getStoredUser());
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    const unsub = subscribeToAuth((user) => {
      setIsAuthenticated(Boolean(user));
      setIsLoading(false);
    });

    return () => unsub();
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#020617] text-white">
        <div className="flex items-center gap-3">
          <span className="h-3 w-3 animate-ping rounded-full bg-lime-400" />
          <span className="text-sm text-slate-400">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
