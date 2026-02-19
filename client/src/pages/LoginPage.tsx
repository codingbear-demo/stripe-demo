import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../lib/api';
import { setUser, generateUsername } from '../lib/auth';

export default function LoginPage() {
  const defaultUsername = useMemo(() => generateUsername(), []);
  const [username, setUsername] = useState(defaultUsername);
  const [password, setPassword] = useState('demo1234');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { user } = await login(username, password);
      setUser(user);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-center">
      <div className="card login-card">
        <h1>Stripe Subscription Demo</h1>
        <p className="subtitle">Sign in to explore the demo</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && <p className="error">{error}</p>}

          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p className="hint">
          A new account is automatically created if the username doesn't exist.
        </p>
      </div>
    </div>
  );
}
