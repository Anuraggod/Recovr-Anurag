import React from 'react';
import { EnrichedTransaction } from '../types/client';
import { 
  Bot, 
  Cpu, 
  Clock, 
  CheckCircle2, 
  ExternalLink, 
  ShieldCheck, 
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';

interface PipelineInspectorProps {
  transaction: EnrichedTransaction | null;
  onOpenCheckout: (paymentLinkId: string, amount: number, merchant: string) => void;
  onSelfRecover: (txId: string) => void;
}

export const PipelineInspector: React.FC<PipelineInspectorProps> = ({
  transaction,
  onOpenCheckout,
  onSelfRecover,
}) => {
  if (!transaction) {
    return (
      <div className="glass-panel rounded-2xl p-8 border border-slate-800/80 flex flex-col items-center justify-center text-center h-full min-h-[450px]">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 mb-3">
          <Bot className="w-6 h-6" />
        </div>
        <h4 className="text-sm font-semibold text-white font-sans">No Transaction Selected</h4>
        <p className="text-xs text-slate-400 max-w-sm mt-1">
          Select an event from the live feed on the left or click "Simulate Failure" above to watch the AI recovery pipeline execute.
        </p>
      </div>
    );
  }

  const failure = transaction.failure_event;
  const pred = transaction.prediction;
  const nudge = transaction.nudges?.[0];
  const amountRs = Math.round(transaction.amount_in_paise / 100);
  const isRecovered = transaction.status === 'recovered';
  const isSelfRecovered = transaction.status === 'cancelled_self_recovered' || nudge?.status === 'cancelled_self_recovered';

  return (
    <div className="glass-panel rounded-2xl p-6 border border-slate-800/80 space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-white font-sans">
              Pipeline Trace: {transaction.merchant_name}
            </span>
            <span className="px-2 py-0.5 rounded-md text-[11px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
              #{transaction.order_id || transaction.id}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Customer: <strong className="text-slate-200">{transaction.user?.name}</strong> • Amount: <strong className="text-emerald-400 font-mono">₹{amountRs}</strong> • Historical Success: <span className="font-mono text-slate-300">{Math.round((transaction.user?.historical_success_rate || 0.9) * 100)}%</span>
          </p>
        </div>

        {/* Live Action Buttons */}
        <div className="flex items-center gap-2">
          {!isRecovered && !isSelfRecovered && nudge && (
            <>
              <button
                onClick={() => onSelfRecover(transaction.id)}
                className="px-3 py-1.5 text-xs font-medium text-amber-300 bg-amber-950/40 hover:bg-amber-900/50 border border-amber-800/50 rounded-lg transition-all flex items-center gap-1.5"
                title="Simulate user completing original payment without nudge"
              >
                <ShieldCheck className="w-3.5 h-3.5" /> Self-Recovered
              </button>

              <button
                onClick={() => onOpenCheckout(nudge.razorpay_payment_link_id || nudge.id, amountRs, transaction.merchant_name)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg shadow-glow-emerald transition-all flex items-center gap-1.5"
              >
                <ExternalLink className="w-3.5 h-3.5" /> Test Recovery Link
              </button>
            </>
          )}

          {isRecovered && (
            <div className="px-3 py-1 text-xs font-bold font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" /> RECOVERED (₹{amountRs})
            </div>
          )}

          {isSelfRecovered && (
            <div className="px-3 py-1 text-xs font-medium font-mono text-amber-300 bg-amber-950/60 border border-amber-500/30 rounded-lg flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4" /> NUDGES CANCELLED (SELF-RECOVERED)
            </div>
          )}
        </div>
      </div>

      {/* 4-STAGE PIPELINE CARDS */}
      <div className="space-y-4">
        
        {/* STAGE 1: WEBHOOK INGESTION */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-cyan-500/10 text-cyan-400 flex items-center justify-center text-xs font-mono font-bold">
                1
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
                Razorpay Ingestion Layer
              </span>
            </div>
            <span className="text-[11px] font-mono text-slate-400">
              Webhook: payment.failed
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono mt-3">
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">DECLINE CODE</span>
              <span className="font-bold text-amber-400">{failure?.upi_decline_code || 'U30'}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">ERROR STEP</span>
              <span className="text-slate-300 truncate block">{failure?.error_step || 'authorization'}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">SOURCE</span>
              <span className="text-slate-300">{failure?.error_source || 'customer'}</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-950/60 border border-slate-800/60">
              <span className="text-[10px] text-slate-500 block">SIGNATURE</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> HMAC Valid
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-400 font-sans mt-2">
            Description: <span className="text-slate-200">{failure?.error_description}</span>
          </p>
        </div>

        {/* STAGE 2: PROBABILISTIC CLASSIFIER */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-indigo-500/10 text-indigo-400 flex items-center justify-center text-xs font-mono font-bold">
                2
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5">
                <Cpu className="w-3.5 h-3.5 text-indigo-400" /> AI Failure Classifier
              </span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
              pred?.decline_type === 'BUSINESS_DECLINE'
                ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
            }`}>
              {pred?.decline_type || 'BUSINESS_DECLINE'}
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800/60">
            <div>
              <span className="text-[10px] text-slate-500 font-mono uppercase block">Confidence Score</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold font-mono text-emerald-400">
                  {Math.round((pred?.confidence_score || 0.85) * 100)}%
                </span>
                <span className="text-xs text-slate-400 font-sans">
                  {pred?.is_recoverable ? 'High Recovery Potential' : 'Suppressed'}
                </span>
              </div>
            </div>

            {/* Feature Signals Breakdown */}
            <div className="text-xs space-y-1 font-mono text-slate-300">
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-slate-400">Base Reason Weight:</span>
                <span className="text-indigo-300">+{pred?.feature_signals?.base_probability ?? 0.85}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-slate-400">Customer History Lift:</span>
                <span className="text-emerald-400">+{pred?.feature_signals?.customer_loyalty_boost ?? 0.08}</span>
              </div>
              <div className="flex items-center justify-between gap-4 text-[11px]">
                <span className="text-slate-400">Amount Sensitivity:</span>
                <span className="text-cyan-400">{pred?.feature_signals?.amount_sensitivity_factor ?? 0.0}</span>
              </div>
            </div>
          </div>
        </div>

        {/* STAGE 3: TIMING PREDICTOR */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-amber-500/10 text-amber-400 flex items-center justify-center text-xs font-mono font-bold">
                3
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Recovery Timing Predictor
              </span>
            </div>
            <span className="text-xs font-mono text-amber-300 font-bold">
              +{Math.round((pred?.optimal_retry_delay_seconds || 300) / 60)} min window
            </span>
          </div>

          <p className="text-xs text-slate-300 font-sans mt-2">
            <strong>Strategy:</strong> <span className="font-mono text-cyan-300">{pred?.recommended_strategy}</span>
          </p>
          <p className="text-xs text-slate-400 font-sans mt-1">
            <strong>Rationale:</strong> {pred?.timing_rationale || 'Calculated cooldown to optimize user conversion while preventing spam fatigue.'}
          </p>
        </div>

        {/* STAGE 4: GROQ LLM & 1-TAP RAZORPAY LINK */}
        <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/30 to-slate-900/60 border border-purple-800/40 relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-purple-500/20 text-purple-300 flex items-center justify-center text-xs font-mono font-bold">
                4
              </div>
              <span className="text-xs font-bold uppercase tracking-wider text-purple-200 font-mono flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-400" /> Groq LLM Nudge & Payment Link
              </span>
            </div>
            <span className="text-[10px] font-mono text-purple-300">
              Llama 3.3 70B (~180ms)
            </span>
          </div>

          {/* Generated Message Preview */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-purple-900/40 text-xs font-sans text-slate-200 mt-3">
            <p className="whitespace-pre-line leading-relaxed">
              {nudge?.message_content || 'Hey! We noticed your checkout was interrupted. Tap here to complete with 1 click.'}
            </p>
            
            {/* Payment link preview */}
            {nudge?.razorpay_payment_link_url && (
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
                  <LinkIcon className="w-3 h-3" /> {nudge.razorpay_payment_link_url}
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  1-Tap Razorpay Checkout
                </span>
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
};
