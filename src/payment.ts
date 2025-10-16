import Stripe from 'stripe';
import { prisma } from './prisma';
import { TenantRequest } from './tenant';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16',
});

export interface PaymentIntentData {
  invoiceId: string;
  amount: number;
  currency: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
}

export interface PaymentLinkData {
  invoiceId: string;
  amount: number;
  currency: string;
  expiresInMinutes?: number;
  customerEmail?: string;
  customerName?: string;
  description?: string;
}

export class PaymentService {
  /**
   * Create a Stripe Payment Intent for an invoice
   */
  static async createPaymentIntent(data: PaymentIntentData): Promise<Stripe.PaymentIntent> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(data.amount * 100), // Convert to cents
        currency: data.currency.toLowerCase(),
        customer_email: data.customerEmail,
        description: data.description || `Payment for Invoice ${data.invoiceId}`,
        metadata: {
          invoiceId: data.invoiceId,
          ...data.metadata,
        },
        automatic_payment_methods: {
          enabled: true,
        },
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  /**
   * Create a Stripe Payment Link for an invoice
   */
  static async createPaymentLink(data: PaymentLinkData): Promise<{ url: string; expiresAt: Date }> {
    try {
      const expiresAt = new Date();
      expiresAt.setMinutes(expiresAt.getMinutes() + (data.expiresInMinutes || 1440)); // Default 24 hours

      const paymentLink = await stripe.paymentLinks.create({
        line_items: [
          {
            price_data: {
              currency: data.currency.toLowerCase(),
              product_data: {
                name: data.description || `Invoice ${data.invoiceId}`,
                description: `Payment for Invoice ${data.invoiceId}`,
              },
              unit_amount: Math.round(data.amount * 100), // Convert to cents
            },
            quantity: 1,
          },
        ],
        metadata: {
          invoiceId: data.invoiceId,
        },
        expires_at: Math.floor(expiresAt.getTime() / 1000),
        allow_promotion_codes: true,
        billing_address_collection: 'required',
        payment_method_types: ['card'],
      });

      return {
        url: paymentLink.url,
        expiresAt,
      };
    } catch (error) {
      console.error('Error creating payment link:', error);
      throw new Error('Failed to create payment link');
    }
  }

  /**
   * Handle successful payment webhook
   */
  static async handlePaymentSuccess(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const invoiceId = paymentIntent.metadata.invoiceId;
      if (!invoiceId) {
        throw new Error('No invoice ID in payment metadata');
      }

      // Update invoice status and create payment record
      await prisma.$transaction(async (tx) => {
        // Update invoice
        await tx.invoice.update({
          where: { id: invoiceId },
          data: {
            status: 'paid',
            balanceDue: 0,
            updatedAt: new Date(),
          },
        });

        // Create payment record
        await tx.invoicePayment.create({
          data: {
            invoiceId,
            paymentId: paymentIntent.id,
            amount: paymentIntent.amount / 100, // Convert from cents
            paymentDate: new Date(),
            paymentMethod: 'stripe_card',
            reference: paymentIntent.id,
            notes: `Stripe payment: ${paymentIntent.status}`,
          },
        });

        // Create activity record
        await tx.invoiceActivity.create({
          data: {
            invoiceId,
            activityType: 'payment_received',
            description: `Payment received via Stripe: $${paymentIntent.amount / 100}`,
            metadata: JSON.stringify({
              paymentIntentId: paymentIntent.id,
              paymentMethod: 'stripe_card',
              amount: paymentIntent.amount / 100,
            }),
          },
        });
      });

      console.log(`✅ Payment processed successfully for invoice ${invoiceId}`);
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment webhook
   */
  static async handlePaymentFailed(paymentIntent: Stripe.PaymentIntent): Promise<void> {
    try {
      const invoiceId = paymentIntent.metadata.invoiceId;
      if (!invoiceId) {
        throw new Error('No invoice ID in payment metadata');
      }

      // Create activity record for failed payment
      await prisma.invoiceActivity.create({
        data: {
          invoiceId,
          activityType: 'payment_failed',
          description: `Payment failed via Stripe: ${paymentIntent.last_payment_error?.message || 'Unknown error'}`,
          metadata: JSON.stringify({
            paymentIntentId: paymentIntent.id,
            error: paymentIntent.last_payment_error,
          }),
        },
      });

      console.log(`❌ Payment failed for invoice ${invoiceId}`);
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }

  /**
   * Get payment status for an invoice
   */
  static async getPaymentStatus(invoiceId: string): Promise<{
    hasPaymentLink: boolean;
    paymentLink?: string;
    paymentLinkExpiresAt?: Date;
    lastPaymentIntent?: string;
    paymentStatus?: string;
  }> {
    try {
      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          payments: {
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });

      if (!invoice) {
        throw new Error('Invoice not found');
      }

      const lastPayment = invoice.payments[0];
      
      return {
        hasPaymentLink: false, // Will be implemented with payment link storage
        lastPaymentIntent: lastPayment?.paymentId,
        paymentStatus: lastPayment ? 'completed' : 'pending',
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }

  /**
   * Create customer portal session for invoice access
   */
  static async createCustomerPortalSession(customerEmail: string, returnUrl: string): Promise<{ url: string }> {
    try {
      // Find or create Stripe customer
      let customer: Stripe.Customer;
      const existingCustomers = await stripe.customers.list({
        email: customerEmail,
        limit: 1,
      });

      if (existingCustomers.data.length > 0) {
        customer = existingCustomers.data[0];
      } else {
        customer = await stripe.customers.create({
          email: customerEmail,
        });
      }

      // Create portal session
      const session = await stripe.billingPortal.sessions.create({
        customer: customer.id,
        return_url: returnUrl,
      });

      return { url: session.url };
    } catch (error) {
      console.error('Error creating customer portal session:', error);
      throw new Error('Failed to create customer portal session');
    }
  }
}

/**
 * Webhook handler for Stripe events
 */
export async function handleStripeWebhook(req: any, res: any): Promise<void> {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('Stripe webhook secret not configured');
    res.status(400).send('Webhook secret not configured');
    return;
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    res.status(400).send('Invalid signature');
    return;
  }

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await PaymentService.handlePaymentSuccess(event.data.object as Stripe.PaymentIntent);
        break;
      case 'payment_intent.payment_failed':
        await PaymentService.handlePaymentFailed(event.data.object as Stripe.PaymentIntent);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
}
