import { Request, Response } from 'express';
import { FailureClassifierService } from '../services/classifier.service';
import { RecoveryTimingPredictorService } from '../services/timing.service';
import { RazorpayService } from '../services/razorpay.service';
import { GroqNudgeService } from '../services/groq.service';
import { NotificationService } from '../services/notification.service';
import { streamService } from '../services/stream.service';
import { db } from '../db/db';
import { v4 as uuidv4 } from 'uuid';
import { UPIDeclineCode, RecoverySimulationInput, User, Transaction, FailureEvent } from '../types';

export class RecoveryController {
  /**
   * SSE Stream endpoint for live dashboard telemetry
   */
  public static streamEvents(req: Request, res: Response): void {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    // Send initial heartbeat
    res.write(`event: connected\ndata: ${JSON.stringify({ status: 'connected', time: new Date().toISOString() })}\n\n`);

    streamService.addClient(res);

    req.on('close', () => {
      streamService.removeClient(res);
    });
  }

  /**
   * Executes end-to-end failure ingestion, AI classification, timing, Groq LLM nudge & Razorpay link creation
   */
  public static async simulateFailure(req: Request, res: Response): Promise<void> {
    try {
      const input: RecoverySimulationInput = req.body;
      const amountInPaise = Math.round((input.amount_in_rupees || 499) * 100);
      const merchantName = input.merchant_name || 'Swiggy Instamart';
      const customerName = input.customer_name || 'Rahul Sharma';
      const customerPhone = input.customer_phone || '+919876543210';
      const upiCode: UPIDeclineCode = input.upi_decline_code || 'U30';
      const successRate = input.historical_success_rate ?? 0.88;
      const ordersCount = input.historical_orders_count ?? 6;

      // 1. Create User
      const userId = `usr_${uuidv4().replace(/-/g, '').substring(0, 10)}`;
      const user: User = {
        id: userId,
        name: customerName,
        email: input.customer_email || `${customerName.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: customerPhone,
        upi_id: `${customerName.toLowerCase().replace(/\s+/g, '')}@okhdfcbank`,
        historical_orders_count: ordersCount,
        historical_success_rate: successRate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.saveUser(user);

      // 2. Create Transaction
      const txId = `txn_${uuidv4().replace(/-/g, '').substring(0, 14)}`;
      const orderId = `order_${Math.floor(100000 + Math.random() * 900000)}`;
      const transaction: Transaction = {
        id: txId,
        user_id: user.id,
        merchant_id: `merch_${merchantName.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
        merchant_name: merchantName,
        amount_in_paise: amountInPaise,
        currency: 'INR',
        order_id: orderId,
        razorpay_payment_id: `pay_${uuidv4().replace(/-/g, '').substring(0, 14)}`,
        status: 'failed',
        payment_method: 'upi_intent',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      await db.saveTransaction(transaction);

      // 3. Create Failure Event
      let errorDesc = 'UPI transaction declined by bank.';
      if (upiCode === 'U30') errorDesc = 'U30: Insufficient balance in customer account.';
      else if (upiCode === 'ZM') errorDesc = 'ZM: Customer entered invalid UPI PIN.';
      else if (upiCode === 'U28') errorDesc = 'U28: Daily transaction amount/frequency limit exceeded.';
      else if (upiCode === 'XB') errorDesc = 'XB: Customer cancelled or payment session timed out.';
      else if (upiCode === 'ZA') errorDesc = 'ZA: Customer bank account is dormant or inactive.';

      const failureEvent: FailureEvent = {
        id: `fail_${uuidv4().replace(/-/g, '').substring(0, 12)}`,
        transaction_id: txId,
        error_code: 'BAD_REQUEST_ERROR',
        upi_decline_code: upiCode,
        error_description: input.custom_failure_reason || errorDesc,
        error_source: 'customer',
        error_step: 'payment_authorization',
        raw_payload: { simulated: true, timestamp: new Date().toISOString() },
        occurred_at: new Date().toISOString(),
      };
      await db.saveFailureEvent(failureEvent);

      // 4. Run AI Failure Classifier
      const classification = FailureClassifierService.classify({
        upi_decline_code: upiCode,
        error_source: 'customer',
        amount_in_paise: amountInPaise,
        user_historical_success_rate: user.historical_success_rate,
        user_orders_count: user.historical_orders_count,
      });

      // 5. Run Recovery Timing Predictor
      const timing = RecoveryTimingPredictorService.predict({
        upi_decline_code: upiCode,
        amount_in_paise: amountInPaise,
        strategy: classification.recommended_strategy,
        user_historical_orders: user.historical_orders_count,
      });

      const predId = `pred_${uuidv4().replace(/-/g, '').substring(0, 12)}`;
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

      let paymentLink = null;
      let generatedNudge = null;
      let nudge = null;

      if (classification.is_recoverable) {
        // 6. Generate Razorpay Payment Link
        paymentLink = await RazorpayService.createRecoveryPaymentLink({
          amountInPaise,
          description: `Recovery payment for ${merchantName} (Order #${orderId})`,
          customer: {
            name: user.name,
            email: user.email,
            contact: user.phone,
          },
          notes: {
            transaction_id: txId,
            recovery_prediction_id: predId,
          },
        });

        // 7. Groq LLM Recovery Nudge Generation
        generatedNudge = await GroqNudgeService.generateRecoveryNudge({
          customerName: user.name,
          merchantName: merchantName,
          amountInRupees: amountInPaise / 100,
          upiDeclineCode: upiCode,
          recoveryPaymentUrl: paymentLink.short_url,
          strategy: classification.recommended_strategy,
        });

        // 8. Schedule Nudge
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

      const responsePayload = {
        success: true,
        transaction,
        user,
        failure_event: failureEvent,
        prediction: {
          ...prediction,
          explanation: classification.explanation,
          timing_rationale: timing.rationale,
        },
        payment_link: paymentLink,
        nudge_content: generatedNudge,
        nudge_record: nudge,
      };

      // Broadcast to live dashboard stream
      streamService.broadcast('simulation_created', responsePayload);

      res.status(201).json(responsePayload);
    } catch (error: any) {
      console.error('❌ Simulation error:', error);
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Simulates customer clicking the 1-tap recovery link and successfully paying
   */
  public static async verifyPaymentLink(req: Request, res: Response): Promise<void> {
    try {
      const { paymentLinkId } = req.params;
      const allNudges = Array.from((await db.getAllTransactions(100)).flatMap(t => t.nudges || []));
      const targetNudge = allNudges.find(n => n.razorpay_payment_link_id === paymentLinkId || n.id === paymentLinkId);

      if (!targetNudge) {
        res.status(404).json({ error: 'Payment link or nudge reference not found' });
        return;
      }

      const txId = targetNudge.transaction_id;
      const now = new Date().toISOString();

      await db.updateTransactionStatus(txId, 'recovered');
      await db.updateNudgeStatus(targetNudge.id, 'recovered', now);

      const updatedTx = await db.getTransactionDetails(txId);

      streamService.broadcast('recovery_completed', {
        transaction_id: txId,
        nudge_id: targetNudge.id,
        recovered_at: now,
        transaction: updatedTx,
      });

      res.status(200).json({
        success: true,
        message: 'Payment recovered successfully via 1-tap link!',
        transaction: updatedTx,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Demonstrates the Self-Recovery cancellation feature live
   */
  public static async triggerSelfRecovery(req: Request, res: Response): Promise<void> {
    try {
      const { transactionId } = req.params;
      const tx = await db.getTransaction(transactionId);
      if (!tx) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }

      await db.updateTransactionStatus(transactionId, 'recovered');
      const cancelledCount = await NotificationService.cancelOnSelfRecovery(transactionId);
      const updatedTx = await db.getTransactionDetails(transactionId);

      streamService.broadcast('self_recovery_triggered', {
        transaction_id: transactionId,
        cancelled_nudges_count: cancelledCount,
        transaction: updatedTx,
      });

      res.status(200).json({
        success: true,
        message: `Self-recovery processed. ${cancelledCount} scheduled nudges cancelled to prevent spam.`,
        transaction: updatedTx,
      });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Forces immediate dispatch of a scheduled nudge for live testing
   */
  public static async forceDispatchNudge(req: Request, res: Response): Promise<void> {
    try {
      const { nudgeId } = req.params;
      await db.updateNudgeStatus(nudgeId, 'sent');
      
      streamService.broadcast('nudge_dispatched', {
        nudge_id: nudgeId,
        dispatched_at: new Date().toISOString(),
      });

      res.status(200).json({ success: true, message: 'Nudge dispatched immediately.' });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
