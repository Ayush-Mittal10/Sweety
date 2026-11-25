import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../context/AuthContext';

function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app">
      <header className="app-header">
        <span className="logo">Sweety</span>
        <nav className="nav">
          <NavLink to="/" end>
            Readings
          </NavLink>
          <NavLink to="/reports">Reports</NavLink>
        </nav>
        <div className="user-menu">
          <span className="muted">Hi, {user.name}</span>
          <button type="button" className="button-link" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <main className="container">
        <Outlet />
      </main>
    </div>
  );
}

export default Layout;
