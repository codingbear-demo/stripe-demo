const BASE = '';

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message || `Request failed: ${res.status}`);
  }

  return res.json();
}

export function login(username: string, password: string) {
  return request<{ user: { id: string; username: string } }>(
    '/api/auth/login',
    {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    },
  );
}

export function createCheckoutSession(userId: string, planId: string) {
  return request<{ url: string }>('/api/billing/checkout-session', {
    method: 'POST',
    body: JSON.stringify({ userId, planId }),
  });
}

export function getSubscription(userId: string) {
  return request<{
    status: string;
    subscription?: {
      priceId: string;
      currentPeriodEnd: string;
      cancelAtPeriodEnd: boolean;
      stripeStatus: string;
    };
  }>(`/api/billing/subscription?userId=${userId}`);
}

export function createPortalSession(userId: string) {
  return request<{ url: string }>('/api/billing/portal-session', {
    method: 'POST',
    body: JSON.stringify({ userId }),
  });
}
