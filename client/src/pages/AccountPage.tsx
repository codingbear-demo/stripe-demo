import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubscription, createPortalSession } from '../lib/api';
import { getUser } from '../lib/auth';

interface SubscriptionData {
  status: string;
  subscription?: {
    priceId: string;
    currentPeriodEnd: string;
    cancelAtPeriodEnd: boolean;
    stripeStatus: string;
  };
}

export default function AccountPage() {
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);
  const user = getUser();

  useEffect(() => {
    if (!user) return;
    getSubscription(user.id)
      .then(setData)
      .catch(() => setData({ status: 'none' }))
      .finally(() => setLoading(false));
  }, []);

  const handleManage = async () => {
    if (!user) return;
    setPortalLoading(true);
    try {
      const { url } = await createPortalSession(user.id);
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Failed to open portal');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-center">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>Account</h1>

      <div className="card account-card">
        <h2>Subscription Status</h2>

        {data?.status === 'none' ? (
          <div>
            <span className="badge badge-none">No Subscription</span>
            <p>You don't have an active subscription yet.</p>
            <Link to="/" className="btn btn-primary">
              Choose a Plan
            </Link>
          </div>
        ) : (
          <div>
            <span
              className={`badge ${data?.status === 'active' ? 'badge-active' : 'badge-inactive'}`}
            >
              {data?.status === 'active' ? 'Active' : 'Inactive'}
            </span>

            {data?.subscription && (
              <div className="subscription-details">
                <p>
                  <strong>Status:</strong> {data.subscription.stripeStatus}
                </p>
                <p>
                  <strong>Current Period End:</strong>{' '}
                  {new Date(
                    data.subscription.currentPeriodEnd,
                  ).toLocaleDateString()}
                </p>
                {data.subscription.cancelAtPeriodEnd && (
                  <p className="cancel-notice">
                    Subscription will cancel at period end
                  </p>
                )}
              </div>
            )}

            <button
              className="btn btn-secondary"
              onClick={handleManage}
              disabled={portalLoading}
            >
              {portalLoading ? 'Opening...' : 'Manage Subscription'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
