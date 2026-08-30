import React, { useState, useEffect, useCallback } from 'react';
import { api } from './services/api';
import { AnalyticsMetrics, EnrichedTransaction, SimulationPayload } from './types/client';
import { Navbar } from './components/Navbar';
import { MetricsOverview } from './components/MetricsOverview';
import { LiveRecoveryFeed } from './components/LiveRecoveryFeed';
import { PipelineInspector } from './components/PipelineInspector';
import { MobileNudgePreview } from './components/MobileNudgePreview';
import { SimulatorModal } from './components/SimulatorModal';
import { RecoveryCheckoutModal } from './components/RecoveryCheckoutModal';
import { SelfRecoveryDemoModal } from './components/SelfRecoveryDemoModal';

export const App: React.FC = () => {
  const [metrics, setMetrics] = useState<AnalyticsMetrics | null>(null);
  const [transactions, setTransactions] = useState<EnrichedTransaction[]>([]);
  const [selectedTx, setSelectedTx] = useState<EnrichedTransaction | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Modals state
  const [isSimulatorOpen, setIsSimulatorOpen] = useState(false);
  const [isSelfRecoveryOpen, setIsSelfRecoveryOpen] = useState(false);
  const [checkoutData, setCheckoutData] = useState<{
    isOpen: boolean;
    paymentLinkId: string | null;
    amount: number;
    merchantName: string;
  }>({
    isOpen: false,
    paymentLinkId: null,
    amount: 499,
    merchantName: 'Merchant',
  });

  const fetchData = useCallback(async () => {
    try {
      const [m, txs] = await Promise.all([
        api.getMetrics(),
        api.getTransactions(50),
      ]);
      setMetrics(m);
      setTransactions(txs);
      if (txs.length > 0 && !selectedTx) {
        setSelectedTx(txs[0]);
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedTx]);

  useEffect(() => {
    fetchData();

    // Subscribe to real-time SSE stream
    const unsubscribe = api.subscribeToEvents((event) => {
      console.log('📡 Real-time SSE event received:', event);
      setIsConnected(true);
      fetchData();

      if (event.type === 'SIMULATION_CREATED' && event.data?.transaction) {
        setSelectedTx(event.data.transaction);
      }
    });

    setIsConnected(true);

    return () => {
      unsubscribe();
    };
  }, [fetchData]);

  // Handlers
  const handleSimulate = async (payload: SimulationPayload) => {
    const res = await api.simulateFailure(payload);
    await fetchData();
    if (res.transaction) {
      const updated = await api.getTransactionDetails(res.transaction.id);
      setSelectedTx(updated);
    }
  };

  const handleOpenCheckout = (paymentLinkId: string, amount: number, merchant: string) => {
    setCheckoutData({
      isOpen: true,
      paymentLinkId,
      amount,
      merchantName: merchant,
    });
  };

  const handleConfirmPayment = async (paymentLinkId: string) => {
    await api.verifyPayment(paymentLinkId);
    await fetchData();
    if (selectedTx) {
      const updated = await api.getTransactionDetails(selectedTx.id);
      setSelectedTx(updated);
    }
  };

  const handleSelfRecover = async (txId: string) => {
    await api.triggerSelfRecovery(txId);
    await fetchData();
    if (selectedTx?.id === txId) {
      const updated = await api.getTransactionDetails(txId);
      setSelectedTx(updated);
    }
  };

  return (
    <div className="min-h-screen bg-background text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      
      {/* Navigation Header */}
      <Navbar
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpenSelfRecoveryDemo={() => setIsSelfRecoveryOpen(true)}
        isConnected={isConnected}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6 space-y-6">
        
        {/* KPI Metrics Banner */}
        <MetricsOverview metrics={metrics} loading={loading} />

        {/* Core Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Live Recovery Feed (5 cols) */}
          <div className="lg:col-span-5 h-full">
            <LiveRecoveryFeed
              transactions={transactions}
              selectedTxId={selectedTx?.id || null}
              onSelectTx={(tx) => setSelectedTx(tx)}
            />
          </div>

          {/* Right Column: AI Pipeline Inspector & Mobile Preview (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* AI Decision Pipeline Inspector */}
            <PipelineInspector
              transaction={selectedTx}
              onOpenCheckout={handleOpenCheckout}
              onSelfRecover={handleSelfRecover}
            />

            {/* Customer Mobile Nudge Simulator (Phone Mockup) */}
            <MobileNudgePreview
              transaction={selectedTx}
              onOpenCheckout={handleOpenCheckout}
            />

          </div>

        </div>

      </main>

      {/* Modals */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        onSimulate={handleSimulate}
      />

      <RecoveryCheckoutModal
        isOpen={checkoutData.isOpen}
        paymentLinkId={checkoutData.paymentLinkId}
        amount={checkoutData.amount}
        merchantName={checkoutData.merchantName}
        onClose={() => setCheckoutData({ ...checkoutData, isOpen: false })}
        onConfirmPayment={handleConfirmPayment}
      />

      <SelfRecoveryDemoModal
        isOpen={isSelfRecoveryOpen}
        onClose={() => setIsSelfRecoveryOpen(false)}
        transactions={transactions}
        onTriggerSelfRecovery={handleSelfRecover}
      />

      {/* Footer */}
      <footer className="border-t border-slate-800/80 py-4 px-4 text-center text-xs text-slate-500 font-mono">
        Recovr AI • Razorpay Hackathon Prototype • Built with Groq LPU Llama 3.3 70B & Node/React
      </footer>

    </div>
  );
};

export default App;
