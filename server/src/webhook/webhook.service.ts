import {
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from '../stripe/stripe.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);
  private readonly webhookSecret: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly stripeService: StripeService,
    private readonly configService: ConfigService,
  ) {
    this.webhookSecret = this.configService.get<string>(
      'app.stripe.webhookSecret',
    )!;
  }

  async handleWebhook(rawBody: Buffer, signature: string) {
    let event: Stripe.Event;

    try {
      event = this.stripeService.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        this.webhookSecret,
      );
    } catch (err) {
      this.logger.error(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Idempotency check
    const existing = await this.prisma.webhookEvent.findUnique({
      where: { stripeEventId: event.id },
    });

    if (existing) {
      this.logger.log(`Event ${event.id} already processed, skipping`);
      return { received: true };
    }

    // Process event
    try {
      await this.processEvent(event);

      // Record successful processing
      await this.prisma.webhookEvent.create({
        data: {
          stripeEventId: event.id,
          type: event.type,
          processed: true,
        },
      });
    } catch (err) {
      this.logger.error(`Error processing event ${event.id}: ${err}`);
      throw err;
    }

    return { received: true };
  }

  private async processEvent(event: Stripe.Event) {
    switch (event.type) {
      case 'checkout.session.completed':
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case 'customer.subscription.updated':
        await this.handleSubscriptionUpdated(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'customer.subscription.deleted':
        await this.handleSubscriptionDeleted(
          event.data.object as Stripe.Subscription,
        );
        break;

      case 'invoice.payment_succeeded':
        this.logger.log(
          `Payment succeeded for invoice ${(event.data.object as any).id}`,
        );
        break;

      case 'invoice.payment_failed':
        this.logger.warn(
          `Payment failed for invoice ${(event.data.object as any).id}`,
        );
        break;

      default:
        this.logger.log(`Unhandled event type: ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(session: Stripe.Checkout.Session) {
    const userId = session.client_reference_id;

    if (!userId) {
      this.logger.error('Checkout session missing client_reference_id');
      return;
    }

    const subscriptionId = session.subscription as string;
    const customerId = session.customer as string;

    // Fetch full subscription details from Stripe
    const subscription =
      await this.stripeService.stripe.subscriptions.retrieve(subscriptionId);

    const item = subscription.items.data[0];
    const priceId = item?.price.id;
    const periodEnd = item?.current_period_end;

    await this.prisma.subscription.upsert({
      where: { userId },
      create: {
        userId,
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        priceId,
        status: subscription.status,
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
      update: {
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscriptionId,
        priceId,
        status: subscription.status,
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    this.logger.log(`Subscription created for user ${userId}`);
  }

  private async handleSubscriptionUpdated(subscription: Stripe.Subscription) {
    const item = subscription.items.data[0];
    const priceId = item?.price.id;
    const periodEnd = item?.current_period_end;

    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existing) {
      this.logger.warn(
        `Subscription ${subscription.id} not found in database`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        priceId,
        status: subscription.status,
        currentPeriodEnd: periodEnd
          ? new Date(periodEnd * 1000)
          : null,
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });

    this.logger.log(`Subscription ${subscription.id} updated`);
  }

  private async handleSubscriptionDeleted(subscription: Stripe.Subscription) {
    const existing = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscription.id },
    });

    if (!existing) {
      this.logger.warn(
        `Subscription ${subscription.id} not found in database`,
      );
      return;
    }

    await this.prisma.subscription.update({
      where: { stripeSubscriptionId: subscription.id },
      data: {
        status: 'canceled',
        cancelAtPeriodEnd: false,
      },
    });

    this.logger.log(`Subscription ${subscription.id} canceled`);
  }
}
