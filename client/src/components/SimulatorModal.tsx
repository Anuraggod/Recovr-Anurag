import React, { useState } from 'react';
import { UPIDeclineCode, SimulationPayload } from '../types/client';
import { X, Play, Sparkles } from 'lucide-react';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSimulate: (payload: SimulationPayload) => Promise<void>;
}

const PRESETS: {
  title: string;
  merchant: string;
  amount: number;
  customer: string;
  phone: string;
  code: UPIDeclineCode;
  description: string;
}[] = [
  {
    title: 'Wrong MPIN (ZM)',
    merchant: 'Swiggy Instamart',
    amount: 549,
    customer: 'Rahul Sharma',
    phone: '+919876543210',
    code: 'ZM',
    description: 'Customer mistyped UPI PIN. High intent; needs instant 1-tap retry.',
  },
  {
    title: 'Low Balance (U30)',
    merchant: 'Zomato Gold',
    amount: 1250,
    customer: 'Priya Patel',
    phone: '+919812345678',
    code: 'U30',
    description: 'Insufficient bank balance. Needs timed recovery window for account top-up.',
  },
  {
    title: 'Abandoned Checkout (XB)',
    merchant: 'Zepto Quick',
    amount: 380,
    customer: 'Ananya Verma',
    phone: '+919899123456',
    code: 'XB',
    description: 'User dropped out of payment flow. Cart preservation nudge triggered.',
  },
  {
    title: 'UPI Limit Exceeded (U28)',
    merchant: 'Flipkart Electronics',
    amount: 8499,
    customer: 'Vikram Malhotra',
    phone: '+919711223344',
    code: 'U28',
    description: 'Bank daily limit reached. Alternative payment rail (Cards/Netbanking) offered.',
  },
  {
    title: 'Dormant Account (ZA)',
    merchant: 'Uber Rides',
    amount: 420,
    customer: 'Sneha Kulkarni',
    phone: '+919988776655',
    code: 'ZA',
    description: 'Technical/Permanent failure. AI suppresses nudge to prevent spam.',
  },
];

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  onSimulate,
}) => {
  const [merchant, setMerchant] = useState('Swiggy Instamart');
  const [customer, setCustomer] = useState('Rahul Sharma');
  const [phone, setPhone] = useState('+919876543210');
  const [amount, setAmount] = useState<number>(549);
  const [declineCode, setDeclineCode] = useState<UPIDeclineCode>('ZM');
  const [historyRate, setHistoryRate] = useState<number>(0.92);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleApplyPreset = (p: typeof PRESETS[0]) => {
    setMerchant(p.merchant);
    setAmount(p.amount);
    setCustomer(p.customer);
    setPhone(p.phone);
    setDeclineCode(p.code);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSimulate({
        merchant_name: merchant,
        customer_name: customer,
        customer_phone: phone,
        amount_in_rupees: amount,
        upi_decline_code: declineCode,
        historical_success_rate: historyRate,
      });
      onClose();
    } catch (err) {
      console.error('Simulation error', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-2xl rounded-3xl p-6 border border-slate-700/80 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
            <Play className="w-5 h-5 fill-emerald-400" />
          </div>
          <div>
            <h3 className="text-base font-bold text-white font-sans">
              Simulate Live UPI Payment Failure
            </h3>
            <p className="text-xs text-slate-400">
              Trigger synthetic Razorpay webhook events to test AI classification, timing & Groq nudges
            </p>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="mb-5">
          <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 block mb-2">
            Instant Test Presets:
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.title}
                type="button"
                onClick={() => handleApplyPreset(preset)}
                className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-left transition-all text-xs"
              >
                <div className="font-bold text-slate-200">{preset.title}</div>
                <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                  {preset.merchant} • ₹{preset.amount}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Merchant Name */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">Merchant Name</label>
              <input
                type="text"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Amount in Rupees */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">Amount (INR ₹)</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                required
                min={1}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>

            {/* Customer Name */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">Customer Name</label>
              <input
                type="text"
                value={customer}
                onChange={(e) => setCustomer(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50"
              />
            </div>

            {/* Customer Phone */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">Customer Phone (WhatsApp/SMS)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
              />
            </div>

            {/* UPI Decline Code */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">UPI Decline Code</label>
              <select
                value={declineCode}
                onChange={(e) => setDeclineCode(e.target.value as UPIDeclineCode)}
                className="w-full px-3 py-2 bg-slate-950/80 border border-slate-800 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500/50 font-mono"
              >
                <option value="ZM">ZM — Invalid / Incorrect PIN (Business Decline)</option>
                <option value="U30">U30 — Insufficient Bank Balance (Business Decline)</option>
                <option value="XB">XB — Customer Session Interrupted / Abandoned (Business Decline)</option>
                <option value="U28">U28 — Daily Transaction Limit Exceeded (Business Decline)</option>
                <option value="U16">U16 — Bank Risk / Velocity Block (Business Decline)</option>
                <option value="ZA">ZA — Dormant / Inactive Account (Technical / Permanent)</option>
                <option value="TM">TM — NPCI Technical Timeout (Technical)</option>
              </select>
            </div>

            {/* Customer History Rate */}
            <div>
              <label className="text-[11px] font-mono text-slate-300 block mb-1">Historical Success Rate: {Math.round(historyRate * 100)}%</label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.05"
                value={historyRate}
                onChange={(e) => setHistoryRate(parseFloat(e.target.value))}
                className="w-full accent-emerald-400 mt-2"
              />
            </div>

          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 text-slate-950 font-bold text-xs shadow-glow-emerald transition-all flex items-center gap-2"
            >
              {loading ? (
                <>Processing...</>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" /> Dispatch & Execute Pipeline
                </>
              )}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
