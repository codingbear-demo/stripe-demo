import { useState } from 'react';
import { plans } from '../config/plans';
import { createCheckoutSession } from '../lib/api';
import { getUser } from '../lib/auth';

export default function PricingPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const user = getUser();

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
        {plans.map((plan) => (
          <div key={plan.id} className={`card pricing-card ${plan.id}`}>
            <h2>{plan.name}</h2>
            <div className="price">{plan.price}</div>
            <ul>
              {plan.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <button
              className="btn btn-primary"
              onClick={() => handleSubscribe(plan.id)}
              disabled={loading !== null}
            >
              {loading === plan.id ? 'Redirecting...' : 'Subscribe'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
