import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

describe('BillingService', () => {
  let service: BillingService;
  let prisma: {
    user: { findUnique: jest.Mock };
    subscription: { findUnique: jest.Mock };
  };
  let stripeService: {
    stripe: {
      checkout: { sessions: { create: jest.Mock } };
      billingPortal: { sessions: { create: jest.Mock } };
    };
  };

  beforeEach(async () => {
    prisma = {
      user: { findUnique: jest.fn() },
      subscription: { findUnique: jest.fn() },
    };

    stripeService = {
      stripe: {
        checkout: { sessions: { create: jest.fn() } },
        billingPortal: { sessions: { create: jest.fn() } },
      },
    };

    const configValues: Record<string, any> = {
      'app.stripe.prices.basic': 'price_basic_123',
      'app.stripe.prices.pro': 'price_pro_456',
      'app.port': 3000,
      'app.nodeEnv': 'development',
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        { provide: PrismaService, useValue: prisma },
        { provide: StripeService, useValue: stripeService },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string) => configValues[key]),
          },
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
  });

  describe('createCheckoutSession', () => {
    it('should create a checkout session with correct params', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'test',
      });
      prisma.subscription.findUnique.mockResolvedValue(null);
      stripeService.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/test',
      });

      const result = await service.createCheckoutSession('user-1', 'basic');

      expect(result).toEqual({ url: 'https://checkout.stripe.com/test' });
      expect(
        stripeService.stripe.checkout.sessions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          mode: 'subscription',
          line_items: [{ price: 'price_basic_123', quantity: 1 }],
          client_reference_id: 'user-1',
          metadata: { userId: 'user-1' },
        }),
      );
    });

    it('should throw BadRequestException for invalid planId', async () => {
      await expect(
        service.createCheckoutSession('user-1', 'invalid'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should pass existing customer ID to checkout', async () => {
      prisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        username: 'test',
      });
      prisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_existing',
      });
      stripeService.stripe.checkout.sessions.create.mockResolvedValue({
        url: 'https://checkout.stripe.com/test',
      });

      await service.createCheckoutSession('user-1', 'pro');

      expect(
        stripeService.stripe.checkout.sessions.create,
      ).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: 'cus_existing',
        }),
      );
    });
  });

  describe('getSubscription', () => {
    it('should return none when no subscription exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      const result = await service.getSubscription('user-1');

      expect(result).toEqual({ status: 'none' });
    });

    it('should return active for active subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: 'sub_123',
        status: 'active',
        priceId: 'price_basic_123',
        currentPeriodEnd: new Date('2026-03-20'),
        cancelAtPeriodEnd: false,
      });

      const result = await service.getSubscription('user-1');

      expect(result.status).toBe('active');
      expect(result.subscription?.stripeStatus).toBe('active');
    });

    it('should return inactive for past_due subscription', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeSubscriptionId: 'sub_123',
        status: 'past_due',
        priceId: 'price_basic_123',
        currentPeriodEnd: new Date('2026-03-20'),
        cancelAtPeriodEnd: false,
      });

      const result = await service.getSubscription('user-1');

      expect(result.status).toBe('inactive');
    });
  });

  describe('createPortalSession', () => {
    it('should throw NotFoundException when no subscription exists', async () => {
      prisma.subscription.findUnique.mockResolvedValue(null);

      await expect(service.createPortalSession('user-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should create portal session with correct customer', async () => {
      prisma.subscription.findUnique.mockResolvedValue({
        stripeCustomerId: 'cus_123',
      });
      stripeService.stripe.billingPortal.sessions.create.mockResolvedValue({
        url: 'https://billing.stripe.com/test',
      });

      const result = await service.createPortalSession('user-1');

      expect(result).toEqual({ url: 'https://billing.stripe.com/test' });
    });
  });
});
