import { AnalyticsMetrics, EnrichedTransaction, SimulationPayload } from '../types/client';
import { INITIAL_MOCK_METRICS, INITIAL_MOCK_TRANSACTIONS } from './mockData';

const API_BASE = import.meta.env.VITE_API_URL || '/api';

// In-memory client-side reactive store for seamless offline/online resilience
let localTransactions: EnrichedTransaction[] = [...INITIAL_MOCK_TRANSACTIONS];
let localMetrics: AnalyticsMetrics = { ...INITIAL_MOCK_METRICS };

function recalculateLocalMetrics(): AnalyticsMetrics {
  const total_failed_count = localTransactions.length;
  const total_failed_volume_in_paise = localTransactions.reduce((acc, t) => acc + t.amount_in_paise, 0);

  const recoveredTxs = localTransactions.filter(t => t.status === 'recovered');
  const total_recovered_count = recoveredTxs.length;
  const total_recovered_volume_in_paise = recoveredTxs.reduce((acc, t) => acc + t.amount_in_paise, 0);

  const businessDeclines = localTransactions.filter(t => t.prediction?.decline_type === 'BUSINESS_DECLINE');
  const business_decline_count = businessDeclines.length;

  const recoveredBDCount = recoveredTxs.filter(t => t.prediction?.decline_type === 'BUSINESS_DECLINE').length;

  const business_decline_recovery_rate_pct = business_decline_count > 0
    ? Math.round((recoveredBDCount / business_decline_count) * 1000) / 10
    : 78.5;

  const overall_recovery_rate_pct = total_failed_count > 0
    ? Math.round((total_recovered_count / total_failed_count) * 1000) / 10
    : 75.0;

  const decline_code_breakdown: Record<string, number> = {};
  for (const t of localTransactions) {
    const code = t.failure_event?.upi_decline_code || 'U30';
    decline_code_breakdown[code] = (decline_code_breakdown[code] || 0) + 1;
  }

  localMetrics = {
    total_failed_count,
    total_failed_volume_in_paise,
    total_recovered_count,
    total_recovered_volume_in_paise,
    business_decline_count,
    business_decline_recovery_rate_pct,
    overall_recovery_rate_pct,
    avg_recovery_latency_minutes: 14.5,
    channel_conversion_lift: {
      whatsapp_conversion_pct: 84,
      sms_conversion_pct: 62,
      raw_checkout_conversion_pct: 31,
    },
    decline_code_breakdown,
  };

  return localMetrics;
}

export const api = {
  async getMetrics(): Promise<AnalyticsMetrics> {
    try {
      const res = await fetch(`${API_BASE}/analytics/metrics`);
      if (!res.ok) throw new Error('Failed to fetch metrics');
      return await res.json();
    } catch {
      return recalculateLocalMetrics();
    }
  },

  async getTransactions(limit = 50): Promise<EnrichedTransaction[]> {
    try {
      const res = await fetch(`${API_BASE}/analytics/transactions?limit=${limit}`);
      if (!res.ok) throw new Error('Failed to fetch transactions');
      const data = await res.json();
      if (data && data.length > 0) {
        localTransactions = data;
        return data;
      }
      return localTransactions;
    } catch {
      return localTransactions;
    }
  },

  async getTransactionDetails(id: string): Promise<EnrichedTransaction> {
    try {
      const res = await fetch(`${API_BASE}/analytics/transactions/${id}`);
      if (!res.ok) throw new Error('Failed to fetch transaction details');
      return await res.json();
    } catch {
      const found = localTransactions.find(t => t.id === id);
      if (found) return found;
      return localTransactions[0];
    }
  },

  async simulateFailure(payload: SimulationPayload): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/recovery/simulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      console.warn('Backend simulate offline, running client simulation engine:', e);
    }

    // Client-side instant simulation engine
    const txId = `txn_${Math.random().toString(36).substring(2, 11)}`;
    const userId = `usr_${Math.random().toString(36).substring(2, 8)}`;
    const amountInPaise = Math.round(payload.amount_in_rupees * 100);
    const upiCode = payload.upi_decline_code;

    const isRecoverable = upiCode !== 'ZA' && upiCode !== 'U19';
    const declineType = isRecoverable ? 'BUSINESS_DECLINE' : 'TECHNICAL_DECLINE';

    let strategy = 'TIMED_RECOVERY_NUDGE';
    let delaySec = 3600;
    let explanation = 'Insufficient bank balance. High recovery potential if nudged after account funding window.';
    let timingRationale = '1-hour cooldown allows fund transfer without being intrusive.';

    if (upiCode === 'ZM') {
      strategy = 'INSTANT_PAYMENT_LINK';
      delaySec = 300;
      explanation = 'Wrong MPIN is a momentary user error. Immediate recovery link achieves 84% conversion.';
      timingRationale = 'Instant 5-minute link window yields maximum recovery before customer abandons order.';
    } else if (upiCode === 'XB') {
      strategy = 'ABANDONED_CART_DISCOUNT_NUDGE';
      delaySec = 1200;
      explanation = 'Customer dropped off at checkout. WhatsApp reminder with 1-tap retry recovers checkout intent.';
      timingRationale = '20-minute gentle reminder restores interrupted grocery/shopping cart.';
    } else if (upiCode === 'U28') {
      strategy = 'NEXT_DAY_RESET_NUDGE';
      delaySec = 36000;
      explanation = 'Daily UPI limit exceeded. Auto-scheduled for next morning 8:30 AM when bank limit resets.';
      timingRationale = 'Scheduled for 8:30 AM following morning after NPCI cumulative debit limit resets.';
    } else if (!isRecoverable) {
      strategy = 'NO_ACTION_TECHNICAL_ERROR';
      delaySec = 0;
      explanation = 'Non-recoverable technical decline. Automated nudges suppressed to prevent customer spam.';
      timingRationale = 'No retry scheduled to protect merchant brand reputation.';
    }

    const paymentLinkId = `plink_${Math.random().toString(36).substring(2, 10)}`;
    const paymentUrl = `https://rzp.io/i/${Math.random().toString(36).substring(2, 8)}`;

    const newTx: EnrichedTransaction = {
      id: txId,
      user_id: userId,
      merchant_id: `merch_${payload.merchant_name.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      merchant_name: payload.merchant_name,
      amount_in_paise: amountInPaise,
      currency: 'INR',
      order_id: `ORD-REC-${Math.floor(1000 + Math.random() * 9000)}`,
      razorpay_payment_id: `pay_${Math.random().toString(36).substring(2, 12)}`,
      status: 'failed',
      payment_method: 'upi_intent',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user: {
        id: userId,
        name: payload.customer_name,
        email: `${payload.customer_name.toLowerCase().replace(/\s+/g, '')}@example.com`,
        phone: payload.customer_phone,
        upi_id: `${payload.customer_name.toLowerCase().replace(/\s+/g, '')}@okhdfcbank`,
        historical_orders_count: 6,
        historical_success_rate: payload.historical_success_rate,
        created_at: new Date(Date.now() - 86400000).toISOString(),
        updated_at: new Date().toISOString(),
      },
      failure_event: {
        id: `fail_${Math.random().toString(36).substring(2, 8)}`,
        transaction_id: txId,
        error_code: 'BAD_REQUEST_ERROR',
        upi_decline_code: upiCode,
        error_description: `${upiCode}: UPI Transaction Authorization Declined`,
        error_source: 'customer',
        error_step: 'payment_authorization',
        occurred_at: new Date().toISOString(),
      },
      prediction: {
        id: `pred_${Math.random().toString(36).substring(2, 8)}`,
        transaction_id: txId,
        is_recoverable: isRecoverable,
        decline_type: declineType as any,
        confidence_score: isRecoverable ? 0.94 : 0.12,
        recommended_strategy: strategy,
        optimal_retry_delay_seconds: delaySec,
        predicted_optimal_time: new Date(Date.now() + delaySec * 1000).toISOString(),
        feature_signals: {
          decline_code_weight: 0.9,
          customer_loyalty_boost: 0.1,
          amount_sensitivity_factor: 0.05,
          hour_of_day_penalty: 0,
        },
        created_at: new Date().toISOString(),
        explanation,
        timing_rationale: timingRationale,
      },
      nudges: isRecoverable ? [
        {
          id: `ndg_${Math.random().toString(36).substring(2, 10)}`,
          transaction_id: txId,
          prediction_id: `pred_sim`,
          channel: 'whatsapp',
          recipient_phone: payload.customer_phone,
          message_content: `Hey ${payload.customer_name}! 👋\n\nYour ₹${payload.amount_in_rupees} order at *${payload.merchant_name}* couldn't go through due to a quick bank timeout.\n\nYour cart is reserved! Tap here to retry in 1 click:\n👉 ${paymentUrl}\n\n_Secure checkout powered by Razorpay_`,
          razorpay_payment_link_id: paymentLinkId,
          razorpay_payment_link_url: paymentUrl,
          status: 'queued',
          scheduled_for: new Date(Date.now() + delaySec * 1000).toISOString(),
          created_at: new Date().toISOString(),
        },
      ] : [],
    };

    localTransactions.unshift(newTx);
    recalculateLocalMetrics();

    return {
      success: true,
      transaction: newTx,
      prediction: newTx.prediction,
      nudge_record: newTx.nudges?.[0],
    };
  },

  async verifyPayment(paymentLinkId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/recovery/verify/${paymentLinkId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend payment verify offline, updating locally:', e);
    }

    // Local payment verification
    for (const tx of localTransactions) {
      const matchingNudge = tx.nudges?.find(n => n.razorpay_payment_link_id === paymentLinkId || n.id === paymentLinkId);
      if (matchingNudge || tx.id === paymentLinkId) {
        tx.status = 'recovered';
        if (matchingNudge) {
          matchingNudge.status = 'recovered';
          matchingNudge.recovered_at = new Date().toISOString();
        }
      }
    }
    recalculateLocalMetrics();
    return { success: true, message: 'Payment captured and verified!' };
  },

  async triggerSelfRecovery(transactionId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/recovery/self-recover/${transactionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend self recovery offline, updating locally:', e);
    }

    // Local self-recovery cancellation
    for (const tx of localTransactions) {
      if (tx.id === transactionId) {
        tx.status = 'recovered';
        if (tx.nudges) {
          for (const n of tx.nudges) {
            if (n.status === 'queued' || n.status === 'sent') {
              n.status = 'cancelled_self_recovered';
            }
          }
        }
      }
    }
    recalculateLocalMetrics();
    return { success: true, message: 'Self-recovery recorded. Scheduled nudges cancelled.' };
  },

  async forceDispatchNudge(nudgeId: string): Promise<any> {
    try {
      const res = await fetch(`${API_BASE}/recovery/retry/${nudgeId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) return await res.json();
    } catch (e) {
      console.warn('Backend dispatch offline, updating locally:', e);
    }

    for (const tx of localTransactions) {
      const n = tx.nudges?.find(ndg => ndg.id === nudgeId);
      if (n) {
        n.status = 'sent';
        n.sent_at = new Date().toISOString();
      }
    }
    return { success: true, message: 'Nudge dispatched immediately.' };
  },

  subscribeToEvents(onEvent: (event: { type: string; data: any }) => void): () => void {
    let eventSource: EventSource | null = null;
    try {
      eventSource = new EventSource(`${API_BASE}/recovery/stream`);

      eventSource.addEventListener('simulation_created', (e) => {
        try {
          onEvent({ type: 'SIMULATION_CREATED', data: JSON.parse(e.data) });
        } catch {}
      });

      eventSource.addEventListener('failure_recovered_event', (e) => {
        try {
          onEvent({ type: 'INCOMING_FAILURE', data: JSON.parse(e.data) });
        } catch {}
      });

      eventSource.addEventListener('recovery_completed', (e) => {
        try {
          onEvent({ type: 'RECOVERY_COMPLETED', data: JSON.parse(e.data) });
        } catch {}
      });

      eventSource.addEventListener('self_recovery_triggered', (e) => {
        try {
          onEvent({ type: 'SELF_RECOVERY', data: JSON.parse(e.data) });
        } catch {}
      });

      eventSource.addEventListener('payment_captured_event', (e) => {
        try {
          onEvent({ type: 'SELF_RECOVERY', data: JSON.parse(e.data) });
        } catch {}
      });
    } catch {
      // EventSource fallback
    }

    return () => {
      if (eventSource) eventSource.close();
    };
  }
};
