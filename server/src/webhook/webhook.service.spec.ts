import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: {
    webhookEvent: {
      findUnique: jest.Mock;
      create: jest.Mock;
    };
    subscription: {
      upsert: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
    };
  };
  let stripeService: {
    stripe: {
      webhooks: { constructEvent: jest.Mock };
      subscriptions: { retrieve: jest.Mock };
    };
  };

  beforeEach(async () => {
    prisma = {
      webhookEvent: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      subscription: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    };

    stripeService = {
      stripe: {
        webhooks: { constructEvent: jest.fn() },
        subscriptions: { retrieve: jest.fn() },
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripeService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('whsec_test'),
          },
        },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  it('should throw BadRequestException on invalid signature', async () => {
    stripeService.stripe.webhooks.constructEvent.mockImplementation(() => {
      throw new Error('Invalid signature');
    });

    await expect(
      service.handleWebhook(Buffer.from('body'), 'bad_sig'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should skip already processed events (idempotency)', async () => {
    stripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_123',
      type: 'checkout.session.completed',
      data: { object: {} },
    });

    prisma.webhookEvent.findUnique.mockResolvedValue({
      id: 1,
      stripeEventId: 'evt_123',
    });

    const result = await service.handleWebhook(Buffer.from('body'), 'sig');

    expect(result).toEqual({ received: true });
    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
  });

  it('should handle checkout.session.completed and upsert subscription', async () => {
    const checkoutSession = {
      client_reference_id: 'user-1',
      subscription: 'sub_123',
      customer: 'cus_123',
    };

    stripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_new',
      type: 'checkout.session.completed',
      data: { object: checkoutSession },
    });

    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    stripeService.stripe.subscriptions.retrieve.mockResolvedValue({
      id: 'sub_123',
      status: 'active',
      current_period_end: 1740000000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_basic' } }] },
    });

    await service.handleWebhook(Buffer.from('body'), 'sig');

    expect(prisma.subscription.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 'user-1' },
        create: expect.objectContaining({
          userId: 'user-1',
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          status: 'active',
        }),
      }),
    );
    expect(prisma.webhookEvent.create).toHaveBeenCalledWith({
      data: {
        stripeEventId: 'evt_new',
        type: 'checkout.session.completed',
        processed: true,
      },
    });
  });

  it('should handle customer.subscription.updated', async () => {
    const subscription = {
      id: 'sub_123',
      status: 'past_due',
      current_period_end: 1740000000,
      cancel_at_period_end: true,
      items: { data: [{ price: { id: 'price_pro' } }] },
    };

    stripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_upd',
      type: 'customer.subscription.updated',
      data: { object: subscription },
    });

    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.subscription.findUnique.mockResolvedValue({
      id: 1,
      stripeSubscriptionId: 'sub_123',
    });

    await service.handleWebhook(Buffer.from('body'), 'sig');

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_123' },
      data: expect.objectContaining({
        status: 'past_due',
        cancelAtPeriodEnd: true,
      }),
    });
  });

  it('should handle customer.subscription.deleted', async () => {
    const subscription = {
      id: 'sub_123',
      status: 'canceled',
      current_period_end: 1740000000,
      cancel_at_period_end: false,
      items: { data: [{ price: { id: 'price_basic' } }] },
    };

    stripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_del',
      type: 'customer.subscription.deleted',
      data: { object: subscription },
    });

    prisma.webhookEvent.findUnique.mockResolvedValue(null);
    prisma.subscription.findUnique.mockResolvedValue({
      id: 1,
      stripeSubscriptionId: 'sub_123',
    });

    await service.handleWebhook(Buffer.from('body'), 'sig');

    expect(prisma.subscription.update).toHaveBeenCalledWith({
      where: { stripeSubscriptionId: 'sub_123' },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
      },
    });
  });

  it('should skip checkout without client_reference_id', async () => {
    stripeService.stripe.webhooks.constructEvent.mockReturnValue({
      id: 'evt_no_ref',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: null,
          subscription: 'sub_123',
          customer: 'cus_123',
        },
      },
    });

    prisma.webhookEvent.findUnique.mockResolvedValue(null);

    await service.handleWebhook(Buffer.from('body'), 'sig');

    expect(prisma.subscription.upsert).not.toHaveBeenCalled();
    expect(prisma.webhookEvent.create).toHaveBeenCalled();
  });
});
