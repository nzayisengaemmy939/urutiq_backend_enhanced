# Stripe Payment Integration Setup

## Environment Variables Required

Add these environment variables to your `.env` file in the `apps/api` directory:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here"
STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
STRIPE_WEBHOOK_SECRET="whsec_your_webhook_secret_here"

# Frontend URL (for payment links and customer portal)
FRONTEND_URL="http://localhost:3000"

# Email Configuration (for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourcompany.com"
```

## Stripe Setup Steps

### 1. Create Stripe Account
- Go to [stripe.com](https://stripe.com) and create an account
- Complete the account setup and verification process

### 2. Get API Keys
- In your Stripe Dashboard, go to **Developers > API Keys**
- Copy your **Publishable key** (starts with `pk_test_`)
- Copy your **Secret key** (starts with `sk_test_`)

### 3. Set Up Webhooks
- In Stripe Dashboard, go to **Developers > Webhooks**
- Click **Add endpoint**
- Set URL to: `https://yourdomain.com/api/sales/webhooks/stripe`
- Select these events:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `payment_intent.canceled`
  - `invoice.payment_succeeded`
  - `invoice.payment_failed`
- Copy the **Webhook signing secret** (starts with `whsec_`)

### 4. Configure Email (Optional)
For automated notifications, set up SMTP:
- **Gmail**: Use App Password (not regular password)
- **Other providers**: Use appropriate SMTP settings

## Testing

### Test Cards
Use these Stripe test cards:
- **Success**: `4242 4242 4242 4242`
- **Decline**: `4000 0000 0000 0002`
- **Requires Authentication**: `4000 0025 0000 3155`

### Test Flow
1. Create an invoice in the system
2. Generate a payment link
3. Use test card to complete payment
4. Verify webhook processing and status updates

## Production Deployment

### 1. Switch to Live Keys
- Replace test keys with live keys from Stripe Dashboard
- Update webhook URL to production domain
- Test with real payment methods

### 2. Security Considerations
- Never commit API keys to version control
- Use environment variables for all sensitive data
- Enable Stripe's fraud protection features
- Set up proper webhook signature verification

### 3. Monitoring
- Set up Stripe Dashboard alerts
- Monitor webhook delivery success rates
- Track payment success/failure rates
- Set up logging for payment events

## Features Implemented

✅ **Payment Processing**
- Stripe Payment Intents
- Payment Links with expiration
- Customer Portal sessions
- Webhook handling

✅ **Customer Experience**
- Professional payment forms
- Mobile-responsive design
- Real-time status updates
- Secure payment processing

✅ **Automation**
- Automatic invoice status updates
- Payment confirmation emails
- Failed payment notifications
- Customer portal access

✅ **Integration**
- Seamless invoice-to-payment flow
- Branded payment pages
- Multi-currency support
- Tax calculation integration

## Troubleshooting

### Common Issues

1. **Webhook Not Receiving Events**
   - Check webhook URL is accessible
   - Verify webhook secret is correct
   - Check Stripe Dashboard for delivery logs

2. **Payment Intent Creation Fails**
   - Verify Stripe secret key is correct
   - Check amount is in correct format (cents)
   - Ensure currency code is valid

3. **Customer Portal Not Working**
   - Check Stripe secret key permissions
   - Verify customer exists in Stripe
   - Check webhook endpoint configuration

### Support
- Stripe Documentation: https://stripe.com/docs
- Stripe Support: https://support.stripe.com
- Webhook Testing: https://stripe.com/docs/webhooks/test
