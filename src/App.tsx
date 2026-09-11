import { Navigate, Route, Routes } from "react-router-dom";
import type { ComponentType, ReactNode } from "react";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";

const LoginPageComponent = LoginPage as unknown as ComponentType;

function ProtectedRoute({ children }: { children: ReactNode }) {
  const loggedIn =
    localStorage.getItem("gridguard_user") !== null;

  if (!loggedIn) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />

      <Route path="/login" element={<LoginPageComponent />} />

      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="*"
        element={<Navigate to="/" replace />}
      />
    </Routes>
  );
}