import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StripeService } from '../src/stripe/stripe.service';

describe('Webhook API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;

  const mockStripeService = {
    stripe: {
      webhooks: {
        constructEvent: jest.fn(),
      },
      subscriptions: {
        retrieve: jest.fn(),
      },
    },
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(StripeService)
      .useValue(mockStripeService)
      .compile();

    app = moduleFixture.createNestApplication({ rawBody: true });
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.webhookEvent.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { username: 'webhook_test', password: 'pass' },
    });
    userId = user.id;

    jest.clearAllMocks();
  });

  afterAll(async () => {
    await prisma.webhookEvent.deleteMany();
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('POST /webhooks/stripe - creates subscription on checkout.session.completed', async () => {
    mockStripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_test_1',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: userId,
          subscription: 'sub_test_1',
          customer: 'cus_test_1',
        },
      },
    });

    mockStripeService.stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_test_1',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_basic' } }] },
    });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({ type: 'checkout.session.completed' })
      .expect(201);

    const sub = await prisma.subscription.findUnique({
      where: { userId },
    });
    expect(sub).toBeDefined();
    expect(sub!.stripeSubscriptionId).toBe('sub_test_1');
    expect(sub!.status).toBe('active');
  });

  it('POST /webhooks/stripe - rejects invalid signature', async () => {
    mockStripeService.stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'bad_sig')
      .send({})
      .expect(400);
  });

  it('POST /webhooks/stripe - skips duplicate events', async () => {
    // First call
    mockStripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_dup',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: userId,
          subscription: 'sub_dup',
          customer: 'cus_dup',
        },
      },
    });

    mockStripeService.stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_dup',
      status: 'active',
      current_period_end: Math.floor(Date.now() / 1000) + 30 * 86400,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_basic' } }] },
    });

    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({})
      .expect(201);

    // Second call with same event ID
    await request(app.getHttpServer())
      .post('/webhooks/stripe')
      .set('stripe-signature', 'valid_sig')
      .send({})
      .expect(201);

    // Should only have one webhook event record
    const events = await prisma.webhookEvent.findMany({
      where: { stripeEventId: 'evt_dup' },
    });
    expect(events).toHaveLength(1);
  });
});
