import React from "react";
import { Navigate } from "react-router-dom";
import { getRole, isAuthenticated } from "../../lib/session";

export default function ProtectedRoute({ children, allowRoles = [] }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  const role = getRole();
  if (allowRoles.length && !allowRoles.includes(role)) {
    const fallback =
      role === "SUPERVISOR" ? "/supervisor/dashboard" : "/admin/dashboard";
    return <Navigate to={fallback} replace />;
  }

  return children;
}
