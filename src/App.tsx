import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar";

import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/Dashboard/DashboardPage";

const App = () => {
  return (
    <Routes>

      {/* PUBLIC PAGES */}

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

      {/* DASHBOARD */}

      <Route
        path="/dashboard"
        element={<DashboardPage />}
      />

    </Routes>
  );
};

export default App;