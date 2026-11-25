import { Navigate, Outlet, useLocation } from 'react-router';
import { useAuth } from '../context/AuthContext';

function ProtectedRoute() {
  const { user, checkingSession } = useAuth();
  const location = useLocation();

  if (checkingSession) {
    return <p className="container muted">Loading…</p>;
  }

  if (!user) {
    // remember where the user was going so login can send them back
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}

export default ProtectedRoute;
