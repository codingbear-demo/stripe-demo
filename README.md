# Stripe Subscription Demo

A full-stack subscription billing demo built with **NestJS** and **React**. Implements Stripe Checkout-based subscription flow with webhook signature verification, idempotent event processing, and database synchronization.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Client (React + Vite)                                  │
│  ├── Login → Auto-create user                           │
│  ├── Pricing → Stripe Checkout redirect                 │
│  ├── Account → Subscription status + Portal             │
│  └── Success/Cancelled → Post-checkout pages            │
├─────────────────────────────────────────────────────────┤
│  Server (NestJS)                                        │
│  ├── /api/auth/login       → User management            │
│  ├── /api/billing/*        → Checkout & Portal sessions  │
│  └── /webhooks/stripe      → Webhook handler            │
├─────────────────────────────────────────────────────────┤
│  Database (SQLite + Prisma)                              │
│  ├── User                                               │
│  ├── Subscription (source of truth from webhooks)       │
│  └── WebhookEvent (idempotency tracking)                │
└─────────────────────────────────────────────────────────┘
```

## Features

- **Stripe Checkout** — Server-side session creation with `client_reference_id` for user tracking
- **Webhook Signature Verification** — Raw body + `stripe-signature` header validation
- **Idempotent Event Processing** — `WebhookEvent` table prevents duplicate processing
- **Customer Portal** — Manage subscriptions, cancel, and update payment methods
- **Source of Truth** — Subscription state is only updated via webhooks, never from client
- **Simple Auth** — Auto-creating users for demo purposes (no session/JWT complexity)

## Prerequisites

- Node.js 20+
- pnpm 9+
- Stripe account (test mode)
- [Stripe CLI](https://stripe.com/docs/stripe-cli) (for local webhook testing)

## Setup

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Configure Environment

```bash
cp .env.example server/.env
```

Edit `server/.env` with your Stripe keys:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRICE_BASIC=price_...
STRIPE_PRICE_PRO=price_...
DATABASE_URL="file:./dev.db"
```

### 3. Stripe Dashboard Setup

1. Create two Products in [Stripe Dashboard](https://dashboard.stripe.com/test/products):
   - **Basic** plan (e.g., $9.99/month)
   - **Pro** plan (e.g., $29.99/month)
2. Copy each product's Price ID into your `.env` file
3. Enable [Customer Portal](https://dashboard.stripe.com/test/settings/billing/portal) in Stripe settings

### 4. Initialize Database

```bash
cd server
npx prisma migrate deploy
```

### 5. Start Development Servers

```bash
# Terminal 1 — Backend
pnpm dev:server

# Terminal 2 — Frontend
pnpm dev:client

# Terminal 3 — Stripe webhook forwarding
stripe listen --forward-to localhost:3000/webhooks/stripe
```

Copy the webhook signing secret from `stripe listen` output into your `.env` as `STRIPE_WEBHOOK_SECRET`.

### 6. Test the Flow

1. Open `http://localhost:5173`
2. Login with pre-filled credentials (auto-creates a new user)
3. Select a plan → redirected to Stripe Checkout
4. Use test card `4242 4242 4242 4242` with any future date and CVC
5. After checkout → redirected to success page
6. Check Account page for subscription status
7. Click "Manage Subscription" to open Stripe Customer Portal

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/auth/login` | Login or create user |
| `POST` | `/api/billing/checkout-session` | Create Stripe Checkout session |
| `GET` | `/api/billing/subscription?userId=` | Get subscription status |
| `POST` | `/api/billing/portal-session` | Create Stripe Customer Portal session |
| `POST` | `/webhooks/stripe` | Stripe webhook endpoint |

## Webhook Events

| Event | Action |
|-------|--------|
| `checkout.session.completed` | Create/update subscription in DB |
| `customer.subscription.updated` | Sync status, period, cancellation |
| `customer.subscription.deleted` | Mark subscription as canceled |
| `invoice.payment_succeeded` | Log only |
| `invoice.payment_failed` | Log only |

## Testing

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e
```

## Production Build

```bash
pnpm build
cd server && node dist/main.js
```

The NestJS server serves the React build as static files in production.

## Security Notes

- **Webhook Signature Verification**: Every webhook request is verified using `stripe.webhooks.constructEvent()` with the raw request body and `stripe-signature` header. This prevents forged webhook events.

- **Idempotent Processing**: The `WebhookEvent` table tracks processed event IDs. If Stripe retries a webhook (e.g., due to network failure), the same event won't be processed twice.

- **Source of Truth**: Subscription state is only mutated by webhook handlers, never by API responses. The success page does not confirm payment — it only indicates that checkout was submitted. The actual subscription activation happens asynchronously via webhooks.

- **Raw Body Handling**: NestJS `rawBody: true` option ensures the webhook signature is verified against the unmodified request body (not JSON-parsed).

- **Price ID Mapping**: Stripe Price IDs are never exposed to the frontend. The client sends a plan identifier (`basic`/`pro`), and the server maps it to the actual Price ID.

- **Demo Auth**: Passwords are stored in plaintext — this is intentional for demo purposes. In production, use bcrypt/argon2 hashing with proper session management.

## Test → Live Checklist

- [ ] Replace `sk_test_` with `sk_live_` secret key
- [ ] Update webhook endpoint URL in Stripe Dashboard
- [ ] Replace `whsec_` with production webhook signing secret
- [ ] Replace test Price IDs with live Price IDs
- [ ] Enable HTTPS and update success/cancel URLs
- [ ] Add proper authentication (JWT/sessions + password hashing)
- [ ] Configure Customer Portal branding in Stripe Dashboard
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Add rate limiting to API endpoints

## Tech Stack

- **Backend**: NestJS, Prisma, SQLite, Stripe SDK
- **Frontend**: React, React Router, Vite
- **Testing**: Jest, Supertest
- **Monorepo**: pnpm workspace
