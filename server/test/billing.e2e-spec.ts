import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { StripeService } from '../src/stripe/stripe.service';

describe('Billing API (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;
  let userId: string;

  const mockStripeService = {
    stripe: {
      checkout: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            url: 'https://checkout.stripe.com/mock',
          }),
        },
      },
      billingPortal: {
        sessions: {
          create: jest.fn().mockResolvedValue({
            url: 'https://billing.stripe.com/mock',
          }),
        },
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

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
  });

  beforeEach(async () => {
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();

    const user = await prisma.user.create({
      data: { username: 'billing_test', password: 'pass' },
    });
    userId = user.id;
  });

  afterAll(async () => {
    await prisma.subscription.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  it('POST /api/billing/checkout-session - returns checkout URL', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/billing/checkout-session')
      .send({ userId, planId: 'basic' })
      .expect(201);

    expect(res.body.url).toBe('https://checkout.stripe.com/mock');
  });

  it('GET /api/billing/subscription - returns none when no subscription', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/billing/subscription?userId=${userId}`)
      .expect(200);

    expect(res.body.status).toBe('none');
  });

  it('POST /api/billing/portal-session - returns 404 when no subscription', async () => {
    await request(app.getHttpServer())
      .post('/api/billing/portal-session')
      .send({ userId })
      .expect(404);
  });
});
