import React from 'react';
import { Zap, Sparkles, Play, BellOff } from 'lucide-react';

interface NavbarProps {
  onOpenSimulator: () => void;
  onOpenSelfRecoveryDemo: () => void;
  isConnected: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenSimulator, onOpenSelfRecoveryDemo, isConnected }) => {
  return (
    <header className="sticky top-0 z-40 w-full glass-panel border-b border-slate-800/80 px-4 lg:px-8 py-3.5">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-cyan-400 p-[1.5px] shadow-glow-emerald">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <Zap className="w-5 h-5 text-emerald-400 fill-emerald-400/30 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white font-sans">
                Recovr<span className="text-emerald-400">.ai</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full">
                Razorpay Stack
              </span>
            </div>
            <p className="text-xs text-slate-400 font-sans hidden sm:block">
              AI-Powered UPI Business Decline Recovery Engine
            </p>
          </div>
        </div>

        {/* Live Stack Badges & Triggers */}
        <div className="flex items-center gap-3">
          
          {/* Engine Status */}
          <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs">
            <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-400 shadow-glow-emerald live-beacon' : 'bg-amber-400'}`}></span>
            <span className="text-slate-300 font-medium font-mono text-[11px]">
              {isConnected ? 'LIVE ENGINE CONNECTED' : 'CONNECTING...'}
            </span>
          </div>

          {/* Groq LPU Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-purple-950/40 border border-purple-800/40 text-[11px] text-purple-300 font-mono">
            <Sparkles className="w-3.5 h-3.5 text-purple-400" />
            <span>Groq Llama 3.3 70B</span>
          </div>

          {/* Self-Recovery Demo Trigger */}
          <button
            onClick={onOpenSelfRecoveryDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-800/80 hover:bg-slate-700/80 hover:text-white border border-slate-700 rounded-lg transition-all"
            title="Demonstrate auto-cancellation on payment.captured"
          >
            <BellOff className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Self-Recovery Guard</span>
          </button>

          {/* Simulate Failure Button */}
          <button
            onClick={onOpenSimulator}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 rounded-lg shadow-glow-emerald transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Play className="w-3.5 h-3.5 fill-slate-950" />
            <span>Simulate Failure</span>
          </button>

        </div>

      </div>
    </header>
  );
};
