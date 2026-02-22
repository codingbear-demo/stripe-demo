import { useEffect, useState } from 'react';
import { plans } from '../config/plans';
import { createCheckoutSession, getSubscription, createPortalSession } from '../lib/api';
import { getUser } from '../lib/auth';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const user = getUser();

  useEffect(() => {
    if (!user) return;
    getSubscription(user.id)
      .then((data) => {
        if (data.status === 'active' && data.subscription?.planName) {
          setCurrentPlan(data.subscription.planName);
        }
      })
      .catch(() => {});
  }, []);

  const handleManage = async () => {
    if (!user) return;
    setLoading('manage');
    try {
      const { url } = await createPortalSession(user.id);
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Failed to open portal');
    } finally {
      setLoading(null);
    }
  };

  const handleSubscribe = async (planId: string) => {
    if (!user) return;
    setLoading(planId);

    try {
      const { url } = await createCheckoutSession(user.id, planId);
      if (url) window.location.href = url;
    } catch (err: any) {
      alert(err.message || 'Failed to create checkout session');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="page">
      <h1>Choose Your Plan</h1>
      <p className="subtitle">Start your subscription today</p>

      <div className="pricing-grid">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          const hasSubscription = currentPlan !== null;
          return (
            <div key={plan.id} className={`card pricing-card ${plan.id} ${isCurrent ? 'is-current' : ''}`}>
              {isCurrent && <span className="current-plan-badge">Current</span>}
              <h2>{plan.name}</h2>
              <div className="price">{plan.price}</div>
              <ul>
                {plan.features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
              {isCurrent ? (
                <button className="btn btn-secondary" disabled>
                  Current Plan
                </button>
              ) : hasSubscription ? (
                <button
                  className="btn btn-secondary"
                  onClick={handleManage}
                  disabled={loading !== null}
                  style={{ width: '100%' }}
                >
                  {loading === 'manage' ? 'Opening...' : 'Manage Subscription'}
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => handleSubscribe(plan.id)}
                  disabled={loading !== null}
                >
                  {loading === plan.id ? 'Redirecting...' : 'Subscribe'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="test-card-info">
        <h3>Test Payment Info</h3>
        <table>
          <tbody>
            <tr><td>Card Number</td><td><code>4242 4242 4242 4242</code></td></tr>
            <tr><td>Expiry Date</td><td><code>12 / 34</code></td></tr>
            <tr><td>CVC</td><td><code>123</code></td></tr>
            <tr><td>Cardholder Name</td><td><code>test</code></td></tr>
            <tr><td>Country</td><td><code>Any country</code></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
