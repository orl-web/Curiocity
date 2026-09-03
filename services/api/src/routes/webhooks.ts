import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Stripe from 'stripe';
import { db } from '../db';
import { payments, userSavedGuides, guides, users } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';
import { config } from '../config';

const router = Router();
const stripe = new Stripe(config.STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' });

router.post('/stripe', async (req: Request, res: Response) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try { event = stripe.webhooks.constructEvent(req.body, sig, config.STRIPE_WEBHOOK_SECRET); }
  catch (err) { console.error('Webhook signature verification failed:', err); return res.status(400).send(`Webhook Error: ${err}`); }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const { guideId, userId, creatorEarnings, platformFee } = session.metadata || {};

      if (guideId && userId) {
        await db.update(payments).set({ status: 'completed', stripePaymentIntentId: session.payment_intent as string, completedAt: new Date(), creatorEarnings: creatorEarnings || '0', platformFee: platformFee || '0' }).where(eq(payments.stripeSessionId, session.id));

        await db.insert(userSavedGuides).values({ id: uuidv4(), userId, guideId }).onConflictDoNothing();
      }
      break;
    }
    case 'checkout.session.expired':
    case 'checkout.session.async_payment_failed': {
      const session = event.data.object as Stripe.Checkout.Session;
      await db.update(payments).set({ status: 'failed' }).where(eq(payments.stripeSessionId, session.id));
      break;
    }
    case 'account.updated': {
      const account = event.data.object as Stripe.Account;
      if (account.details_submitted && account.charges_enabled && account.payouts_enabled) {
        // Account fully onboarded
      }
      break;
    }
  }

  res.json({ received: true });
});

export { router as webhooksRouter };