import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './lib/auth';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import PricingPage from './pages/PricingPage';
import SuccessPage from './pages/SuccessPage';
import CancelledPage from './pages/CancelledPage';
import AccountPage from './pages/AccountPage';

function RequireAuth({ children }: { children: React.ReactNode }) {
  const user = getUser();
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <RequireAuth>
                <PricingPage />
              </RequireAuth>
            }
          />
          <Route
            path="/success"
            element={
              <RequireAuth>
                <SuccessPage />
              </RequireAuth>
            }
          />
          <Route
            path="/cancelled"
            element={
              <RequireAuth>
                <CancelledPage />
              </RequireAuth>
            }
          />
          <Route
            path="/account"
            element={
              <RequireAuth>
                <AccountPage />
              </RequireAuth>
            }
          />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
