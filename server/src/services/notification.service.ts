import { db } from '../db/db';
import { NudgeSent, NudgeChannel } from '../types';
import { v4 as uuidv4 } from 'uuid';

export interface DispatchNudgeParams {
  transactionId: string;
  predictionId: string;
  recipientPhone: string;
  channel: NudgeChannel;
  messageContent: string;
  paymentLinkId?: string;
  paymentLinkUrl?: string;
  scheduledDelaySeconds: number;
}

export class NotificationService {
  /**
   * Schedules or immediately dispatches a multi-channel recovery nudge
   */
  public static async scheduleNudge(params: DispatchNudgeParams): Promise<NudgeSent> {
    const now = new Date();
    const scheduledFor = new Date(now.getTime() + params.scheduledDelaySeconds * 1000).toISOString();
    const isImmediate = params.scheduledDelaySeconds <= 30;

    const nudge: NudgeSent = {
      id: `ndg_${uuidv4().replace(/-/g, '').substring(0, 16)}`,
      transaction_id: params.transactionId,
      prediction_id: params.predictionId,
      channel: params.channel,
      recipient_phone: params.recipientPhone,
      message_content: params.messageContent,
      razorpay_payment_link_id: params.paymentLinkId,
      razorpay_payment_link_url: params.paymentLinkUrl,
      status: isImmediate ? 'sent' : 'queued',
      scheduled_for: scheduledFor,
      sent_at: isImmediate ? now.toISOString() : undefined,
      created_at: now.toISOString(),
    };

    await db.saveNudge(nudge);
    console.log(`📨 [Nudge Engine] Scheduled ${params.channel.toUpperCase()} nudge for tx ${params.transactionId} at ${scheduledFor} (Status: ${nudge.status})`);
    return nudge;
  }

  /**
   * Cancels all pending nudges when user self-recovers (e.g. on payment.captured webhook)
   */
  public static async cancelOnSelfRecovery(transactionId: string): Promise<number> {
    const cancelledCount = await db.cancelPendingNudgesForTransaction(transactionId);
    console.log(`🛡️ [Self-Recovery] Cancelled ${cancelledCount} scheduled nudges for tx ${transactionId} because payment was captured!`);
    return cancelledCount;
  }
}
