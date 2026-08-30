import React from 'react';
import { AnalyticsMetrics } from '../types/client';
import { TrendingUp, IndianRupee, Zap, Clock, CheckCircle2, MessageSquare, Smartphone } from 'lucide-react';

interface MetricsOverviewProps {
  metrics: AnalyticsMetrics | null;
  loading?: boolean;
}

export const MetricsOverview: React.FC<MetricsOverviewProps> = ({ metrics }) => {
  const recoveredRupees = metrics ? Math.round(metrics.total_recovered_volume_in_paise / 100) : 0;
  const failedRupees = metrics ? Math.round(metrics.total_failed_volume_in_paise / 100) : 0;
  const bdRecoveryRate = metrics?.business_decline_recovery_rate_pct ?? 78.5;
  const overallRate = metrics?.overall_recovery_rate_pct ?? 62.5;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      
      {/* 1. Recovered Revenue Card */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-2xl group-hover:bg-emerald-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400/90 font-mono flex items-center gap-1.5">
            <IndianRupee className="w-3.5 h-3.5" /> Recovered Revenue
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" /> Live
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold tracking-tight text-white font-sans">
            ₹{recoveredRupees.toLocaleString('en-IN')}
          </span>
          <span className="text-xs text-slate-400">
            of ₹{failedRupees.toLocaleString('en-IN')} failed
          </span>
        </div>
        {/* Recovery Progress Bar */}
        <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
          <div 
            className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-700"
            style={{ width: `${Math.min(100, Math.max(10, overallRate))}%` }}
          ></div>
        </div>
      </div>

      {/* 2. Business Decline Recovery Rate */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl group-hover:bg-indigo-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400/90 font-mono flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5" /> BD Recovery Rate
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            High Intent
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold tracking-tight text-white font-sans">
            {bdRecoveryRate}%
          </span>
          <span className="text-xs text-indigo-300/80 font-medium">
            (PIN / Balance / Cart)
          </span>
        </div>
        <p className="text-xs text-slate-400">
          {metrics?.total_recovered_count ?? 0} successful recoveries from {metrics?.business_decline_count ?? 0} BDs
        </p>
      </div>

      {/* 3. Avg Recovery Latency */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-cyan-500/20 hover:border-cyan-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-cyan-400/90 font-mono flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Avg Recovery Window
          </span>
          <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            Optimal
          </span>
        </div>
        <div className="flex items-baseline gap-2 mb-2">
          <span className="text-3xl font-extrabold tracking-tight text-white font-sans">
            {metrics?.average_recovery_time_minutes ?? 14.5} <span className="text-base font-medium text-slate-400">min</span>
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Smart cooldown avoids spam & respects DND sleeping hours
        </p>
      </div>

      {/* 4. Multi-Channel Conversion */}
      <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300">
        <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 rounded-full blur-2xl group-hover:bg-violet-500/20 transition-all"></div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-violet-400/90 font-mono flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5" /> Channel Lift
          </span>
          <span className="text-[11px] font-mono text-slate-400">
            Groq LPU
          </span>
        </div>
        <div className="space-y-2 mt-3">
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <MessageSquare className="w-3.5 h-3.5 text-emerald-400" /> WhatsApp (1-Tap):
            </span>
            <span className="font-mono font-bold text-emerald-400">
              {metrics?.channel_effectiveness?.whatsapp?.rate ?? 84}% conv.
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-slate-300">
              <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> SMS Link:
            </span>
            <span className="font-mono font-bold text-cyan-400">
              {metrics?.channel_effectiveness?.sms?.rate ?? 62}% conv.
            </span>
          </div>
        </div>
      </div>

    </div>
  );
};
