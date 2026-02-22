import { Link, useNavigate } from 'react-router-dom';
import { getUser, clearUser } from '../lib/auth';

export default function Layout({ children }: { children: React.ReactNode }) {
  const user = getUser();
  const navigate = useNavigate();

  const handleLogout = () => {
    clearUser();
    navigate('/login');
  };

  return (
    <div className="layout">
      <nav className="navbar">
        <Link to="/" className="nav-brand">
          Stripe Demo
        </Link>
        {user && (
          <div className="nav-right">
            <Link to="/account" className="nav-cta">
              Account
            </Link>
            <span className="nav-user">{user.username}</span>
            <button className="btn btn-small" onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </nav>
      <main>{children}</main>
    </div>
  );
}
