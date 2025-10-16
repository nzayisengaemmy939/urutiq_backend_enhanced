# Automated Payment Reminders & Notifications Setup

## Overview

The system includes automated payment reminders and notifications that run via cron jobs. This document explains how to set up and configure these automated processes.

## Features Implemented

✅ **Automated Payment Reminders**
- Overdue payment reminders
- Due soon notifications (3 days before due date)
- Bulk reminder sending
- Customizable email templates

✅ **Payment Confirmations**
- Automatic confirmation emails after successful payments
- Payment receipt generation
- Transaction details included

✅ **Invoice Notifications**
- New invoice notifications
- Invoice update notifications
- Professional email templates

✅ **Recurring Invoice Processing**
- Automatic recurring invoice generation
- Flexible scheduling (daily, weekly, monthly, quarterly, yearly)
- Template-based invoice creation

## Setup Instructions

### 1. Environment Variables

Add these to your `.env` file:

```bash
# Email Configuration (Required for notifications)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="noreply@yourcompany.com"

# Frontend URL (for payment links in emails)
FRONTEND_URL="http://localhost:3000"

# Redis (for job queue)
REDIS_URL="redis://localhost:6379"
```

### 2. Email Setup

#### Gmail Setup
1. Enable 2-factor authentication
2. Generate an App Password:
   - Go to Google Account settings
   - Security > 2-Step Verification > App passwords
   - Generate password for "Mail"
   - Use this password in `SMTP_PASS`

#### Other Email Providers
- **Outlook**: `smtp-mail.outlook.com:587`
- **Yahoo**: `smtp.mail.yahoo.com:587`
- **Custom SMTP**: Use your provider's settings

### 3. Cron Job Setup

#### Option A: System Cron (Recommended for Production)

Create a cron job to run daily:

```bash
# Edit crontab
crontab -e

# Add this line to run daily at 9 AM
0 9 * * * cd /path/to/your/apps/api && node -e "require('./dist/cron.js').CronService.runDailyJobs()"
```

#### Option B: Node.js Cron Library

Install `node-cron`:

```bash
npm install node-cron
```

Create a cron service file:

```javascript
// apps/api/src/cron-service.ts
import cron from 'node-cron';
import { CronService } from './cron';

// Run daily at 9 AM
cron.schedule('0 9 * * *', () => {
  console.log('Running daily cron jobs...');
  CronService.runDailyJobs();
});

// Run weekly on Mondays at 10 AM
cron.schedule('0 10 * * 1', () => {
  console.log('Running weekly cron jobs...');
  CronService.runWeeklyJobs();
});
```

### 4. Queue System Setup

#### Redis Setup (Required for job queue)

**Install Redis:**
```bash
# Ubuntu/Debian
sudo apt-get install redis-server

# macOS
brew install redis

# Windows
# Download from https://redis.io/download
```

**Start Redis:**
```bash
redis-server
```

**Verify Redis is running:**
```bash
redis-cli ping
# Should return: PONG
```

### 5. Testing the System

#### Test Email Notifications

```bash
# Test sending a payment reminder
curl -X POST http://localhost:3001/api/sales/invoices/{invoice-id}/send-reminder \
  -H "Content-Type: application/json" \
  -d '{"type": "overdue"}'
```

#### Test Bulk Reminders

```bash
# Test bulk sending
curl -X POST http://localhost:3001/api/sales/invoices/send-bulk-reminders \
  -H "Content-Type: application/json" \
  -d '{"type": "overdue", "invoiceIds": ["invoice-id-1", "invoice-id-2"]}'
```

## Notification Templates

The system includes these email templates:

### 1. Payment Reminders

**Overdue Payment Reminder**
- Sent when payment is past due date
- Includes payment link and contact information
- Professional tone with urgency

**Due Soon Reminder**
- Sent 3 days before due date
- Friendly reminder tone
- Includes payment link

### 2. Payment Confirmations

**Payment Confirmation**
- Sent after successful payment
- Includes transaction details
- Professional receipt format

### 3. Invoice Notifications

**Invoice Sent**
- Sent when invoice is created/sent
- Includes invoice details and payment link
- Professional business communication

**Invoice Updated**
- Sent when invoice is modified
- Includes updated information
- Clear communication about changes

## Customization

### Custom Email Templates

You can customize email templates by modifying the `NotificationService` in `apps/api/src/notifications.ts`:

```typescript
// Example: Custom overdue reminder template
private static getPaymentReminderTemplate(type: 'overdue' | 'due_soon'): NotificationTemplate {
  if (type === 'overdue') {
    return {
      id: 'payment_reminder_overdue',
      name: 'Overdue Payment Reminder',
      type: 'email',
      subject: 'URGENT: Payment Overdue - {{invoiceNumber}}',
      body: `Dear {{customerName}},

Your payment for Invoice {{invoiceNumber}} is now overdue.

Amount Due: {{currency}} {{amount}}
Due Date: {{dueDate}}

Please make payment immediately to avoid late fees.

Payment Link: {{paymentLink}}

Contact us: {{companyEmail}} | {{companyPhone}}

Best regards,
{{companyName}}`,
      variables: ['customerName', 'invoiceNumber', 'amount', 'currency', 'dueDate', 'paymentLink', 'companyEmail', 'companyPhone', 'companyName'],
      isActive: true
    }
  }
  // ... rest of template
}
```

### Custom Reminder Timing

Modify the reminder logic in `NotificationService.sendPaymentReminders()`:

```typescript
// Change from 3 days to 7 days before due date
const soonDueDate = new Date()
soonDueDate.setDate(soonDueDate.getDate() + 7) // Changed from 3 to 7
```

## Monitoring & Maintenance

### 1. Log Monitoring

Check logs for:
- Successful email sends
- Failed email attempts
- Cron job execution
- Queue processing

### 2. Email Delivery Tracking

Monitor:
- SMTP connection success
- Email bounce rates
- Spam folder issues
- Customer response rates

### 3. Performance Optimization

- Monitor queue processing times
- Optimize database queries for large invoice lists
- Consider rate limiting for bulk operations
- Monitor Redis memory usage

## Troubleshooting

### Common Issues

1. **Emails Not Sending**
   - Check SMTP credentials
   - Verify email provider settings
   - Check spam folder
   - Test SMTP connection

2. **Cron Jobs Not Running**
   - Verify cron job syntax
   - Check file paths
   - Ensure proper permissions
   - Check system logs

3. **Queue Processing Issues**
   - Verify Redis is running
   - Check Redis connection
   - Monitor queue size
   - Check worker processes

### Debug Commands

```bash
# Test SMTP connection
node -e "
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransporter({
  host: 'smtp.gmail.com',
  port: 587,
  auth: { user: 'your-email@gmail.com', pass: 'your-app-password' }
});
transporter.verify().then(console.log).catch(console.error);
"

# Test Redis connection
node -e "
const redis = require('redis');
const client = redis.createClient('redis://localhost:6379');
client.ping().then(console.log).catch(console.error);
"
```

## Security Considerations

1. **Email Security**
   - Use TLS/SSL for SMTP
   - Never log email passwords
   - Use environment variables for credentials

2. **Cron Job Security**
   - Run with minimal privileges
   - Validate all inputs
   - Log all activities
   - Monitor for anomalies

3. **Queue Security**
   - Secure Redis connection
   - Validate job data
   - Implement rate limiting
   - Monitor queue health
