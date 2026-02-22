import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getSubscription, createPortalSession } from '../lib/api';
import { getUser } from '../lib/auth';
import { plans } from '../config/plans';

interface SubscriptionData {
  status: string;
  subscription?: {
    priceId: string;
    planName: string | null;
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

  const plan = plans.find((p) => p.id === data?.subscription?.planName);

  return (
    <div className="page page-account">
      <h1>Account</h1>

      {data?.status === 'none' ? (
        <div className="card account-card account-empty">
          <div className="account-empty-icon">?</div>
          <h2>No Active Subscription</h2>
          <p>You don't have an active subscription yet. Choose a plan to get started.</p>
          <Link to="/" className="btn btn-primary">
            Choose a Plan
          </Link>
        </div>
      ) : (
        <div className="card account-card">
          <div className="account-header">
            <div>
              <div className="account-plan-label">Current Plan</div>
              <div className="account-plan-name">{plan?.name ?? 'Unknown'}</div>
              {plan && <div className="account-plan-price">{plan.price}</div>}
            </div>
            <span
              className={`badge ${data?.status === 'active' ? 'badge-active' : 'badge-inactive'}`}
            >
              {data?.status === 'active' ? 'Active' : 'Inactive'}
            </span>
          </div>

          {data?.subscription && (
            <div className="account-details">
              <div className="account-detail-row">
                <span className="account-detail-label">Status</span>
                <span className="account-detail-value">{data.subscription.stripeStatus}</span>
              </div>
              <div className="account-detail-row">
                <span className="account-detail-label">Current Period End</span>
                <span className="account-detail-value">
                  {new Date(data.subscription.currentPeriodEnd).toLocaleDateString()}
                </span>
              </div>
              {data.subscription.cancelAtPeriodEnd && (
                <div className="account-detail-row">
                  <span className="account-detail-label cancel-notice">
                    Cancels at period end
                  </span>
                </div>
              )}
            </div>
          )}

          <button
            className="btn btn-primary"
            onClick={handleManage}
            disabled={portalLoading}
          >
            {portalLoading ? 'Opening...' : 'Manage Subscription'}
          </button>
        </div>
      )}
    </div>
  );
}
