import { Routes, Route, Navigate } from "react-router-dom";

// Public Components & Pages
import Navbar from "./components/Navbar";
import HomePage from "./pages/HomePage";
import AboutPage from "./pages/AboutPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

// Authenticated Layout & Route Protection
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";

// Authenticated Pages
import Dashboard from "./pages/Dashboard/Dashboard";
import Analytics from "./pages/Analytics/Analytics";
import Energy from "./pages/Energy/Energy";
import GridMonitoring from "./pages/GridMonitoring/GridMonitoring";
import ConnectSensor from "./pages/ConnectSensor/ConnectSensor";
import Alerts from "./pages/Alerts/Alerts";
import MLDetection from "./pages/MLDetection/MLDetection";
import Settings from "./pages/Settings/Settings";
import Profile from "./pages/Profile/Profile";

const App = () => {
  return (
    <Routes>
      {/* PUBLIC ROUTES (Outside authenticated AppLayout, no Anime.js) */}
      <Route
        path="/"
        element={
          <>
            <Navbar />
            <HomePage />
          </>
        }
      />

      <Route
        path="/about"
        element={
          <>
            <Navbar />
            <AboutPage />
          </>
        }
      />

      <Route
        path="/login"
        element={
          <>
            <Navbar />
            <LoginPage />
          </>
        }
      />

      <Route
        path="/register"
        element={
          <>
            <Navbar />
            <RegisterPage />
          </>
        }
      />

      {/* AUTHENTICATED ROUTES (Protected & using AppLayout with Anime.js) */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/energy" element={<Energy />} />
          <Route path="/grid-monitoring" element={<GridMonitoring />} />
          <Route path="/connect-sensor" element={<ConnectSensor />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/ml-detection" element={<MLDetection />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/profile" element={<Profile />} />

          {/* Backward compatibility redirects for nested paths */}
          <Route path="/dashboard/analytics" element={<Navigate to="/analytics" replace />} />
          <Route path="/dashboard/energy" element={<Navigate to="/energy" replace />} />
          <Route path="/dashboard/grid" element={<Navigate to="/grid-monitoring" replace />} />
          <Route path="/dashboard/connect-sensor" element={<Navigate to="/connect-sensor" replace />} />
          <Route path="/dashboard/alerts" element={<Navigate to="/alerts" replace />} />
          <Route path="/dashboard/ml" element={<Navigate to="/ml-detection" replace />} />
          <Route path="/dashboard/settings" element={<Navigate to="/settings" replace />} />
        </Route>
      </Route>

      {/* Catch-all fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;