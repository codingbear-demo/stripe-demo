import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class BillingService {
  private readonly prices: Record<string, string>;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    this.prices = {
      basic: this.configService.get<string>('app.stripe.prices.basic')!,
      pro: this.configService.get<string>('app.stripe.prices.pro')!,
    };
  }

  async createCheckoutSession(userId: string, planId: string) {
    const priceId = this.prices[planId];
    if (!priceId) {
      throw new BadRequestException(`Invalid plan: ${planId}`);
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    const sessionParams: Record<string, any> = {
      mode: 'subscription' as const,
      payment_method_types: ['card' as const],
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${this.getBaseUrl()}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${this.getBaseUrl()}/cancelled`,
      client_reference_id: userId,
      metadata: { userId },
    };

    if (subscription?.stripeCustomerId) {
      sessionParams.customer = subscription.stripeCustomerId;
    }

    const session =
      await this.stripeService.stripe.checkout.sessions.create(sessionParams);

    return { url: session.url };
  }

  async getSubscription(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription || !subscription.stripeSubscriptionId) {
      return { status: 'none' };
    }

    const isActive = ['active', 'trialing'].includes(subscription.status);

    return {
      status: isActive ? 'active' : 'inactive',
      subscription: {
        priceId: subscription.priceId,
        currentPeriodEnd: subscription.currentPeriodEnd,
        cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
        stripeStatus: subscription.status,
      },
    };
  }

  async createPortalSession(userId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { userId },
    });

    if (!subscription?.stripeCustomerId) {
      throw new NotFoundException('No subscription found for this user');
    }

    const session =
      await this.stripeService.stripe.billingPortal.sessions.create({
        customer: subscription.stripeCustomerId,
        return_url: `${this.getBaseUrl()}/account`,
      });

    return { url: session.url };
  }

  private getBaseUrl(): string {
    const port = this.configService.get<number>('app.port');
    const nodeEnv = this.configService.get<string>('app.nodeEnv');
    if (nodeEnv === 'production') {
      return process.env.BASE_URL || `http://localhost:${port}`;
    }
    return 'http://localhost:5173';
  }
}
