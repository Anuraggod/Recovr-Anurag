import React, { useState } from 'react';
import { EnrichedTransaction } from '../types/client';
import { Activity, Search, CheckCircle, XCircle, ShieldAlert, ArrowRight, Sparkles } from 'lucide-react';

interface LiveRecoveryFeedProps {
  transactions: EnrichedTransaction[];
  selectedTxId: string | null;
  onSelectTx: (tx: EnrichedTransaction) => void;
}

export const LiveRecoveryFeed: React.FC<LiveRecoveryFeedProps> = ({
  transactions,
  selectedTxId,
  onSelectTx,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'RECOVERED' | 'BD' | 'TECHNICAL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredList = transactions.filter((tx) => {
    // Tab filter
    if (filter === 'RECOVERED' && tx.status !== 'recovered') return false;
    if (filter === 'BD' && tx.prediction?.decline_type !== 'BUSINESS_DECLINE') return false;
    if (filter === 'TECHNICAL' && tx.prediction?.decline_type !== 'TECHNICAL_DECLINE') return false;

    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const name = tx.user?.name.toLowerCase() || '';
      const merch = tx.merchant_name.toLowerCase();
      const code = tx.failure_event?.upi_decline_code?.toLowerCase() || '';
      return name.includes(q) || merch.includes(q) || code.includes(q) || tx.id.includes(q);
    }
    return true;
  });

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 flex flex-col h-full">
      
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-sans flex items-center gap-2">
              Live Failure & Recovery Telemetry
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-slate-800 text-slate-300">
                {filteredList.length} events
              </span>
            </h3>
            <p className="text-xs text-slate-400">Real-time incoming UPI declines from Razorpay webhook</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-900/90 rounded-xl border border-slate-800/90 text-xs">
          {(['ALL', 'BD', 'RECOVERED', 'TECHNICAL'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-2.5 py-1 rounded-lg font-medium transition-all text-[11px] ${
                filter === tab
                  ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab === 'BD' ? 'Business Declines' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative mb-3">
        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
        <input
          type="text"
          placeholder="Filter by customer, merchant (Swiggy, Zomato), or decline code (U30, ZM)..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-9 pr-4 py-2 bg-slate-950/60 border border-slate-800/80 rounded-xl text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 transition-all font-sans"
        />
      </div>

      {/* Transaction Feed List */}
      <div className="flex-1 overflow-y-auto space-y-2 pr-1 max-h-[580px]">
        {filteredList.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No transaction events matching current criteria.
          </div>
        ) : (
          filteredList.map((tx) => {
            const isSelected = tx.id === selectedTxId;
            const amountInRs = Math.round(tx.amount_in_paise / 100);
            const isRecovered = tx.status === 'recovered';
            const isSelfRecovered = tx.status === 'cancelled_self_recovered' || (tx.nudges?.some(n => n.status === 'cancelled_self_recovered'));
            const isBD = tx.prediction?.decline_type === 'BUSINESS_DECLINE';
            const upiCode = tx.failure_event?.upi_decline_code || 'U30';

            return (
              <div
                key={tx.id}
                onClick={() => onSelectTx(tx)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/50 shadow-glow-emerald'
                    : 'bg-slate-900/40 border-slate-800/60 hover:bg-slate-800/40 hover:border-slate-700/80'
                }`}
              >
                {/* Left Accent Stripe */}
                <div
                  className={`absolute left-0 top-0 bottom-0 w-1 ${
                    isRecovered
                      ? 'bg-emerald-400'
                      : isBD
                      ? 'bg-cyan-400'
                      : 'bg-rose-500'
                  }`}
                />

                <div className="flex items-center justify-between gap-3">
                  
                  {/* Merchant & Customer Info */}
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700/60 flex items-center justify-center text-xs font-bold text-white font-mono shrink-0 mt-0.5">
                      {tx.merchant_name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white text-xs font-sans">
                          {tx.merchant_name}
                        </span>
                        <span className="text-[10px] font-mono text-slate-400">
                          #{tx.order_id || tx.id.substring(0, 8)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        {tx.user?.name || 'Customer'} • <span className="font-mono text-slate-400">{tx.user?.phone}</span>
                      </p>
                    </div>
                  </div>

                  {/* Status & Amount */}
                  <div className="text-right shrink-0">
                    <div className="text-xs font-bold font-mono text-white">
                      ₹{amountInRs.toLocaleString('en-IN')}
                    </div>
                    
                    {/* Status Pill */}
                    <div className="mt-1 flex items-center justify-end gap-1">
                      {isRecovered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          <CheckCircle className="w-2.5 h-2.5" /> RECOVERED
                        </span>
                      ) : isSelfRecovered ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          <ShieldAlert className="w-2.5 h-2.5 text-amber-400" /> SELF-RECOVERED
                        </span>
                      ) : isBD ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          <Sparkles className="w-2.5 h-2.5" /> BD NUDGE
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                          <XCircle className="w-2.5 h-2.5" /> NON-RECOVERABLE
                        </span>
                      )}
                    </div>
                  </div>

                </div>

                {/* Decline Code and Rationale snippet */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5">
                    <span className={`px-1.5 py-0.2 rounded font-bold ${
                      upiCode === 'U30' ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' :
                      upiCode === 'ZM' ? 'bg-purple-950/60 text-purple-300 border border-purple-800/40' :
                      upiCode === 'XB' ? 'bg-blue-950/60 text-blue-300 border border-blue-800/40' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                      {upiCode}
                    </span>
                    <span className="truncate max-w-[190px] text-slate-400 font-sans">
                      {tx.failure_event?.error_description || 'Payment failed'}
                    </span>
                  </span>

                  <span className="text-[10px] text-slate-500 flex items-center gap-1">
                    Inspect <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>

              </div>
            );
          })
        )}
      </div>

    </div>
  );
};
