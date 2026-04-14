import "./index.css";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import { getRole, isAuthenticated } from "./lib/session";

import PublicLandingPage from "./pages/generated/PublicLandingPage";
import AdminLayout from "./layouts/AdminLayout";
import SupervisorLayout from "./layouts/SupervisorLayout";
import AdminLogin from "./pages/generated/AdminLogin";
import AdminDashboard from "./pages/generated/AdminDashboard";
import AdminAnalyticsDashboard from "./pages/generated/AdminAnalyticsDashboard";
import AdminIssuesManagement from "./pages/generated/AdminIssuesManagement";
import AdminMlPredictions from "./pages/generated/AdminMlPredictions";
import AdminWardManagement from "./pages/generated/AdminWardManagement";
import AdminWardsMap from "./pages/generated/AdminWardsMap";
import AdminWorkforceManagement from "./pages/generated/AdminWorkforceManagement";
import AdminSupervisorDetail from "./pages/generated/AdminSupervisorDetail";
import AdminWorkerDetail from "./pages/generated/AdminWorkerDetail";
import SupervisorDashboard from "./pages/generated/SupervisorDashboard";
import SupervisorWardMap from "./pages/generated/SupervisorWardMap";
import SupervisorWorkersPanel from "./pages/generated/SupervisorWorkersPanel";

function App() {
  return (
    <HashRouter>
      <AppRoutes />
    </HashRouter>
  );
}

function AppRoutes() {
  const role = getRole();
  const authenticated = isAuthenticated();
  const homeRoute =
    role === "SUPERVISOR" ? "/supervisor/dashboard" : "/admin/dashboard";

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/public" replace />} />

      {/* Public / Auth */}
      <Route path="/public" element={<PublicLandingPage />} />
      <Route
        path="/login"
        element={
          authenticated ? (
            <Navigate to={homeRoute} replace />
          ) : (
            <AdminLogin />
          )
        }
      />

      {/* Admin Routes with Layout */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowRoles={["ADMIN"]}>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<AdminDashboard />} />
        <Route path="analytics" element={<AdminAnalyticsDashboard />} />
        <Route path="issues" element={<AdminIssuesManagement />} />
        <Route path="ml-predictions" element={<AdminMlPredictions />} />
        <Route path="wards" element={<AdminWardManagement />} />
        <Route path="wards-map" element={<AdminWardsMap />} />
        <Route path="workforce" element={<AdminWorkforceManagement />} />
        <Route
          path="workforce/supervisor/:id"
          element={<AdminSupervisorDetail />}
        />
        <Route path="workforce/worker/:id" element={<AdminWorkerDetail />} />
      </Route>

      {/* Supervisor Routes */}
      <Route
        path="/supervisor"
        element={
          <ProtectedRoute allowRoles={["SUPERVISOR"]}>
            <SupervisorLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<SupervisorDashboard />} />
        <Route path="ward-map" element={<SupervisorWardMap />} />
        <Route path="workers" element={<SupervisorWorkersPanel />} />
        <Route
          path="my-issues"
          element={<Navigate to="dashboard" replace />}
        />
        <Route
          path="my-workers"
          element={<Navigate to="workers" replace />}
        />
      </Route>

      {/* Fallback */}
      <Route
        path="*"
        element={
          <Navigate to={authenticated ? homeRoute : "/public"} replace />
        }
      />
    </Routes>
  );
}

export default App;
