import React from 'react';
import { X, CheckCircle2, ArrowRight, BellOff } from 'lucide-react';
import { EnrichedTransaction } from '../types/client';

interface SelfRecoveryDemoModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: EnrichedTransaction[];
  onTriggerSelfRecovery: (txId: string) => Promise<void>;
}

export const SelfRecoveryDemoModal: React.FC<SelfRecoveryDemoModalProps> = ({
  isOpen,
  onClose,
  transactions,
  onTriggerSelfRecovery,
}) => {
  if (!isOpen) return null;

  const pendingTxs = transactions.filter(
    (t) => t.status === 'failed' && t.nudges?.some((n) => n.status === 'queued' || n.status === 'sent')
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-xl rounded-3xl p-6 border border-slate-700/80 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20">
            <BellOff className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sans">
              Self-Recovery & Spam Prevention Guard
            </h3>
            <p className="text-xs text-slate-400 font-sans">
              Automated cancellation of scheduled nudges upon <code>payment.captured</code>
            </p>
          </div>
        </div>

        {/* Explanation Card */}
        <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-2.5 mb-5 text-xs text-slate-300">
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong>The Problem:</strong> When an initial UPI attempt fails, the customer often retries directly on their own within 60 seconds and succeeds.
            </p>
          </div>
          <div className="flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p>
              <strong>Recovr Guard:</strong> When Razorpay emits <code>payment.captured</code> for that order, Recovr instantly cancels any queued recovery nudges, ensuring customers are never sent confusing duplicate payment links.
            </p>
          </div>
        </div>

        {/* Actionable List */}
        <div>
          <span className="text-[11px] font-mono uppercase text-slate-400 block mb-2 font-semibold">
            Active Transactions with Scheduled Nudges:
          </span>

          {pendingTxs.length === 0 ? (
            <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
              No active pending nudges right now. Simulate a new failure first to test this flow!
            </div>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {pendingTxs.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex items-center justify-between gap-3 text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{tx.merchant_name} (₹{Math.round(tx.amount_in_paise / 100)})</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Customer: {tx.user?.name} • Nudge: {tx.nudges?.[0]?.status}
                    </div>
                  </div>

                  <button
                    onClick={async () => {
                      await onTriggerSelfRecovery(tx.id);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  >
                    Simulate Capture <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
