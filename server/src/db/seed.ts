import { db, initDatabase } from './db';
import { FailureClassifierService } from '../services/classifier.service';
import { RecoveryTimingPredictorService } from '../services/timing.service';
import { GroqNudgeService } from '../services/groq.service';
import { NotificationService } from '../services/notification.service';
import { UPIDeclineCode, User, Transaction, FailureEvent } from '../types';

const SAMPLE_CUSTOMERS = [
  { name: 'Rahul Sharma', email: 'rahul.s@gmail.com', phone: '+919876543210', upi: 'rahul@okhdfcbank', historyRate: 0.94, orders: 12 },
  { name: 'Priya Patel', email: 'priya.p@outlook.com', phone: '+919812345678', upi: 'priya@icici', historyRate: 0.91, orders: 8 },
  { name: 'Ananya Verma', email: 'ananya.v@gmail.com', phone: '+919899123456', upi: 'ananya@paytm', historyRate: 0.88, orders: 5 },
  { name: 'Vikram Malhotra', email: 'vikram.m@gmail.com', phone: '+919711223344', upi: 'vikram@oksbi', historyRate: 0.95, orders: 20 },
  { name: 'Sneha Kulkarni', email: 'sneha.k@yahoo.com', phone: '+919988776655', upi: 'sneha@axisbank', historyRate: 0.75, orders: 2 },
  { name: 'Rohan Gupta', email: 'rohan.g@gmail.com', phone: '+919123456789', upi: 'rohan@ybl', historyRate: 0.82, orders: 4 },
  { name: 'Tanvi Joshi', email: 'tanvi.j@gmail.com', phone: '+919345678901', upi: 'tanvi@kotak', historyRate: 0.96, orders: 15 },
  { name: 'Aditya Sen', email: 'aditya.sen@gmail.com', phone: '+919456789012', upi: 'aditya@ibl', historyRate: 0.70, orders: 1 },
];

const SAMPLE_MERCHANTS = [
  { name: 'Swiggy Instamart', amount: 549 },
  { name: 'Zomato Gold', amount: 899 },
  { name: 'Blinkit', amount: 385 },
  { name: 'Zepto Daily', amount: 720 },
  { name: 'Flipkart', amount: 3499 },
  { name: 'Uber India', amount: 460 },
  { name: 'BookMyShow', amount: 1120 },
  { name: 'Myntra', amount: 2490 },
];

const SCENARIOS: { code: UPIDeclineCode; reason: string; recoverStatus: 'recovered' | 'failed' }[] = [
  { code: 'ZM', reason: 'Invalid UPI PIN entered', recoverStatus: 'recovered' },
  { code: 'U30', reason: 'Insufficient balance in bank account', recoverStatus: 'recovered' },
  { code: 'XB', reason: 'Customer checkout session interrupted', recoverStatus: 'recovered' },
  { code: 'U28', reason: 'Daily UPI transaction limit exceeded', recoverStatus: 'recovered' },
  { code: 'U30', reason: 'Insufficient funds for debit', recoverStatus: 'failed' },
  { code: 'ZM', reason: 'MPIN authentication failure', recoverStatus: 'recovered' },
  { code: 'ZA', reason: 'Dormant bank account', recoverStatus: 'failed' },
  { code: 'XB', reason: 'Customer abandoned at payment window', recoverStatus: 'recovered' },
];

export async function seedRealisticData(): Promise<void> {
  await initDatabase();
  console.log('🌱 Seeding realistic UPI transactions, failures, and recovery events...');

  for (let i = 0; i < SCENARIOS.length; i++) {
    const cust = SAMPLE_CUSTOMERS[i % SAMPLE_CUSTOMERS.length];
    const merch = SAMPLE_MERCHANTS[i % SAMPLE_MERCHANTS.length];
    const scenario = SCENARIOS[i];
    const amountInPaise = merch.amount * 100;

    // 1. User
    const userId = `usr_seed_${i + 1}`;
    const user: User = {
      id: userId,
      name: cust.name,
      email: cust.email,
      phone: cust.phone,
      upi_id: cust.upi,
      historical_orders_count: cust.orders,
      historical_success_rate: cust.historyRate,
      created_at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.saveUser(user);

    // 2. Transaction
    const txId = `txn_seed_${1000 + i}`;
    const isRecovered = scenario.recoverStatus === 'recovered';
    const tx: Transaction = {
      id: txId,
      user_id: userId,
      merchant_id: `merch_${merch.name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      merchant_name: merch.name,
      amount_in_paise: amountInPaise,
      currency: 'INR',
      order_id: `ORD-REC-${7890 + i}`,
      razorpay_payment_id: `pay_seed_${uuidHex(10)}`,
      status: isRecovered ? 'recovered' : 'failed',
      payment_method: 'upi_intent',
      created_at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
      updated_at: new Date().toISOString(),
    };
    await db.saveTransaction(tx);

    // 3. Failure Event
    const failId = `fail_seed_${i + 1}`;
    const failureEvent: FailureEvent = {
      id: failId,
      transaction_id: txId,
      error_code: 'BAD_REQUEST_ERROR',
      upi_decline_code: scenario.code,
      error_description: scenario.reason,
      error_source: 'customer',
      error_step: 'payment_authorization',
      raw_payload: { simulated_seed: true },
      occurred_at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    };
    await db.saveFailureEvent(failureEvent);

    // 4. Classifier
    const classification = FailureClassifierService.classify({
      upi_decline_code: scenario.code,
      error_source: 'customer',
      amount_in_paise: amountInPaise,
      user_historical_success_rate: cust.historyRate,
      user_orders_count: cust.orders,
    });

    // 5. Timing
    const timing = RecoveryTimingPredictorService.predict({
      upi_decline_code: scenario.code,
      amount_in_paise: amountInPaise,
      strategy: classification.recommended_strategy,
      user_historical_orders: cust.orders,
    });

    const predId = `pred_seed_${i + 1}`;
    await db.savePrediction({
      id: predId,
      transaction_id: txId,
      is_recoverable: classification.is_recoverable,
      decline_type: classification.decline_type,
      confidence_score: classification.confidence_score,
      recommended_strategy: classification.recommended_strategy,
      optimal_retry_delay_seconds: timing.optimal_retry_delay_seconds,
      predicted_optimal_time: timing.predicted_optimal_time,
      feature_signals: classification.feature_signals,
      created_at: new Date(Date.now() - (i + 1) * 3600000).toISOString(),
    });

    if (classification.is_recoverable) {
      const paymentLinkId = `plink_seed_${uuidHex(8)}`;
      const paymentUrl = `https://rzp.io/i/${uuidHex(6)}`;

      const nudgeContent = await GroqNudgeService.generateRecoveryNudge({
        customerName: cust.name,
        merchantName: merch.name,
        amountInRupees: merch.amount,
        upiDeclineCode: scenario.code,
        recoveryPaymentUrl: paymentUrl,
        strategy: classification.recommended_strategy,
      });

      const nudge = await NotificationService.scheduleNudge({
        transactionId: txId,
        predictionId: predId,
        recipientPhone: cust.phone,
        channel: 'whatsapp',
        messageContent: nudgeContent.whatsapp_message,
        paymentLinkId,
        paymentLinkUrl: paymentUrl,
        scheduledDelaySeconds: timing.optimal_retry_delay_seconds,
      });

      if (isRecovered) {
        await db.updateNudgeStatus(nudge.id, 'recovered', new Date(Date.now() - i * 1800000).toISOString());
      }
    }
  }

  console.log('✅ Seeding complete! Database loaded with realistic baseline data.');
}

function uuidHex(len: number): string {
  let s = '';
  const hex = '0123456789abcdef';
  for (let i = 0; i < len; i++) {
    s += hex[Math.floor(Math.random() * hex.length)];
  }
  return s;
}

// Run directly if invoked from CLI
if (require.main === module) {
  seedRealisticData().catch(console.error);
}
