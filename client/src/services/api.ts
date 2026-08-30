import { AnalyticsMetrics, EnrichedTransaction, SimulationPayload } from '../types/client';

const API_BASE = '/api';

export const api = {
  async getMetrics(): Promise<AnalyticsMetrics> {
    const res = await fetch(`${API_BASE}/analytics/metrics`);
    if (!res.ok) throw new Error('Failed to fetch metrics');
    return res.json();
  },

  async getTransactions(limit = 50): Promise<EnrichedTransaction[]> {
    const res = await fetch(`${API_BASE}/analytics/transactions?limit=${limit}`);
    if (!res.ok) throw new Error('Failed to fetch transactions');
    return res.json();
  },

  async getTransactionDetails(id: string): Promise<EnrichedTransaction> {
    const res = await fetch(`${API_BASE}/analytics/transactions/${id}`);
    if (!res.ok) throw new Error('Failed to fetch transaction details');
    return res.json();
  },

  async simulateFailure(payload: SimulationPayload): Promise<any> {
    const res = await fetch(`${API_BASE}/recovery/simulate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Simulation failed');
    return res.json();
  },

  async verifyPayment(paymentLinkId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/recovery/verify/${paymentLinkId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Payment verification failed');
    return res.json();
  },

  async triggerSelfRecovery(transactionId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/recovery/self-recover/${transactionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Self recovery trigger failed');
    return res.json();
  },

  async forceDispatchNudge(nudgeId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/recovery/retry/${nudgeId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error('Force dispatch failed');
    return res.json();
  },

  subscribeToEvents(onEvent: (event: { type: string; data: any }) => void): () => void {
    const eventSource = new EventSource(`${API_BASE}/recovery/stream`);

    eventSource.addEventListener('simulation_created', (e) => {
      try {
        onEvent({ type: 'SIMULATION_CREATED', data: JSON.parse(e.data) });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    eventSource.addEventListener('failure_recovered_event', (e) => {
      try {
        onEvent({ type: 'INCOMING_FAILURE', data: JSON.parse(e.data) });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    eventSource.addEventListener('recovery_completed', (e) => {
      try {
        onEvent({ type: 'RECOVERY_COMPLETED', data: JSON.parse(e.data) });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    eventSource.addEventListener('self_recovery_triggered', (e) => {
      try {
        onEvent({ type: 'SELF_RECOVERY', data: JSON.parse(e.data) });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    eventSource.addEventListener('payment_captured_event', (e) => {
      try {
        onEvent({ type: 'SELF_RECOVERY', data: JSON.parse(e.data) });
      } catch (err) {
        console.error('SSE parse error', err);
      }
    });

    return () => {
      eventSource.close();
    };
  }
};
