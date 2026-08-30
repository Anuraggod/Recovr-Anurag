import { Request, Response } from 'express';
import { RazorpayService } from '../services/razorpay.service';
import { FailureClassifierService } from '../services/classifier.service';
import { RecoveryTimingPredictorService } from '../services/timing.service';
import { GroqNudgeService } from '../services/groq.service';
import { NotificationService } from '../services/notification.service';
import { streamService } from '../services/stream.service';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { UPIDeclineCode, User, Transaction, FailureEvent } from '../types';

export class WebhookController {
  public static async handleRazorpayWebhook(req: Request, res: Response): Promise<void> {
    try {
      const signature = req.headers['x-razorpay-signature'] as string;
      const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

      // Verify HMAC Signature
      const isValid = RazorpayService.verifyWebhookSignature(rawBody, signature);
      if (!isValid && process.env.NODE_ENV === 'production') {
        res.status(400).json({ error: 'Invalid webhook signature' });
        return;
      }

      const event = req.body?.event;
      const payload = req.body?.payload?.payment?.entity;

      console.log(`⚡ [Razorpay Webhook Received] Event: ${event}, Payment ID: ${payload?.id}`);

      if (event === 'payment.failed' && payload) {
        const amountInPaise = payload.amount || 49900;
        const customerName = payload.notes?.customer_name || payload.contact_name || 'Customer';
        const customerPhone = payload.contact || '+919876543210';
        const customerEmail = payload.email || 'customer@example.com';
        const merchantName = payload.notes?.merchant_name || 'QuickMart Online';
        
        // Map UPI decline codes or error description
        const errorDesc = payload.error_description || 'Payment failed';
        const upiCode: UPIDeclineCode = (payload.error_code === 'BAD_REQUEST_ERROR' && errorDesc.toLowerCase().includes('pin'))
          ? 'ZM'
          : (errorDesc.toLowerCase().includes('balance') || errorDesc.toLowerCase().includes('insufficient'))
          ? 'U30'
          : (errorDesc.toLowerCase().includes('limit'))
          ? 'U28'
          : 'XB';

        // 1. Persist User & Transaction
        const userId = `usr_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
        const user: User = {
          id: userId,
          name: customerName,
          email: customerEmail,
          phone: customerPhone,
          historical_orders_count: 5,
          historical_success_rate: 0.90,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.saveUser(user);

        const txId = `txn_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
        const transaction: Transaction = {
          id: txId,
          user_id: user.id,
          merchant_id: 'merch_rzp_live_01',
          merchant_name: merchantName,
          amount_in_paise: amountInPaise,
          currency: 'INR',
          order_id: payload.order_id || `order_${uuidv4().substring(0, 8)}`,
          razorpay_payment_id: payload.id,
          status: 'failed',
          payment_method: payload.method || 'upi',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        await db.saveTransaction(transaction);

        // 2. Persist Failure Event
        const failureEvent: FailureEvent = {
          id: `fail_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
          transaction_id: txId,
          error_code: payload.error_code || 'PAYMENT_FAILED',
          upi_decline_code: upiCode,
          error_description: errorDesc,
          error_source: (payload.error_source as any) || 'customer',
          error_step: payload.error_step || 'payment_authorization',
          raw_payload: payload,
          occurred_at: new Date().toISOString(),
        };
        await db.saveFailureEvent(failureEvent);

        // 3. AI Classifier
        const classification = FailureClassifierService.classify({
          upi_decline_code: upiCode,
          error_source: failureEvent.error_source,
          amount_in_paise: amountInPaise,
          user_historical_success_rate: user.historical_success_rate,
          user_orders_count: user.historical_orders_count,
        });

        // 4. Recovery Timing Predictor
        const timing = RecoveryTimingPredictorService.predict({
          upi_decline_code: upiCode,
          amount_in_paise: amountInPaise,
          strategy: classification.recommended_strategy,
          user_historical_orders: user.historical_orders_count,
        });

        const predId = `pred_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
        const prediction = await db.savePrediction({
          id: predId,
          transaction_id: txId,
          is_recoverable: classification.is_recoverable,
          decline_type: classification.decline_type,
          confidence_score: classification.confidence_score,
          recommended_strategy: classification.recommended_strategy,
          optimal_retry_delay_seconds: timing.optimal_retry_delay_seconds,
          predicted_optimal_time: timing.predicted_optimal_time,
          feature_signals: classification.feature_signals,
          created_at: new Date().toISOString(),
        });

        let nudge = null;
        let paymentLink = null;

        if (classification.is_recoverable) {
          // 5. Generate Razorpay Recovery Link
          paymentLink = await RazorpayService.createRecoveryPaymentLink({
            amountInPaise,
            description: `Recovery for Order #${transaction.order_id}`,
            customer: {
              name: user.name,
              email: user.email,
              contact: user.phone,
            },
            notes: { transaction_id: txId, merchant_name: merchantName },
          });

          // 6. Groq LLM Nudge Synthesizer
          const generatedNudge = await GroqNudgeService.generateRecoveryNudge({
            customerName: user.name,
            merchantName: merchantName,
            amountInRupees: amountInPaise / 100,
            upiDeclineCode: upiCode,
            recoveryPaymentUrl: paymentLink.short_url,
            strategy: classification.recommended_strategy,
          });

          // 7. Schedule Nudge Dispatch
          nudge = await NotificationService.scheduleNudge({
            transactionId: txId,
            predictionId: predId,
            recipientPhone: user.phone,
            channel: 'whatsapp',
            messageContent: generatedNudge.whatsapp_message,
            paymentLinkId: paymentLink.id,
            paymentLinkUrl: paymentLink.short_url,
            scheduledDelaySeconds: timing.optimal_retry_delay_seconds,
          });
        }

        // Broadcast to SSE Stream
        streamService.broadcast('failure_recovered_event', {
          type: 'INCOMING_FAILURE',
          transaction,
          user,
          failure_event: failureEvent,
          prediction,
          nudge,
          paymentLink,
        });

        res.status(200).json({ status: 'processed', transaction_id: txId, recoverable: classification.is_recoverable });
        return;
      }

      if (event === 'payment.captured' && payload) {
        // Self-Recovery Event: User paid before or after nudge
        console.log(`🎉 [Payment Captured] Order ID: ${payload.order_id}`);
        const txs = await db.getAllTransactions(100);
        const matchedTx = txs.find(t => t.order_id === payload.order_id || t.razorpay_payment_id === payload.id);

        if (matchedTx) {
          await db.updateTransactionStatus(matchedTx.id, 'recovered');
          const cancelledCount = await NotificationService.cancelOnSelfRecovery(matchedTx.id);

          streamService.broadcast('payment_captured_event', {
            type: 'SELF_RECOVERY',
            transaction_id: matchedTx.id,
            cancelled_nudges_count: cancelledCount,
            captured_at: new Date().toISOString(),
          });
        }

        res.status(200).json({ status: 'captured_acknowledged' });
        return;
      }

      res.status(200).json({ status: 'ignored_unsupported_event' });
    } catch (error: any) {
      console.error('❌ Webhook error:', error);
      res.status(500).json({ error: error.message });
    }
  }
}
