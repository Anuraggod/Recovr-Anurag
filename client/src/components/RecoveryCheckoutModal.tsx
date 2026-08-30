import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { X, CheckCircle, ShieldCheck, CreditCard, Smartphone, Sparkles, Lock } from 'lucide-react';

interface RecoveryCheckoutModalProps {
  isOpen: boolean;
  paymentLinkId: string | null;
  amount: number;
  merchantName: string;
  onClose: () => void;
  onConfirmPayment: (paymentLinkId: string) => Promise<void>;
}

export const RecoveryCheckoutModal: React.FC<RecoveryCheckoutModalProps> = ({
  isOpen,
  paymentLinkId,
  amount,
  merchantName,
  onClose,
  onConfirmPayment,
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!isOpen || !paymentLinkId) return null;

  const handlePay = async () => {
    setProcessing(true);
    try {
      await onConfirmPayment(paymentLinkId);
      setSuccess(true);
      
      // Trigger Confetti
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#10b981', '#06b6d4', '#6366f1', '#f59e0b'],
      });

      setTimeout(() => {
        setProcessing(false);
        setSuccess(false);
        onClose();
      }, 1800);
    } catch (err) {
      console.error(err);
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 border border-slate-700/80 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Close */}
        {!processing && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Razorpay Brand Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-mono uppercase text-slate-400 block">SECURE RECOVERY CHECKOUT</span>
            <h3 className="text-base font-bold text-white font-sans">{merchantName}</h3>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400 block">AMOUNT TO PAY</span>
            <span className="text-lg font-extrabold font-mono text-emerald-400">₹{amount.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {success ? (
          /* SUCCESS STATE */
          <div className="py-8 text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 shadow-glow-emerald animate-bounce">
              <CheckCircle className="w-8 h-8" />
            </div>
            <h4 className="text-lg font-bold text-white font-sans">Payment Recovered!</h4>
            <p className="text-xs text-slate-300">
              ₹{amount} captured via Razorpay 1-Tap Recovery Link.
            </p>
            <p className="text-[11px] text-emerald-400 font-mono">
              Dashboard telemetry updated in real time.
            </p>
          </div>
        ) : (
          /* CHECKOUT FORM */
          <div className="space-y-4">
            
            <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-300">
              <Sparkles className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Smart retry link active — instant 1-tap UPI verification.</span>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="text-[11px] font-mono text-slate-400 block">SELECT PAYMENT RAIL</label>

              {/* UPI Option */}
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  selectedMethod === 'upi'
                    ? 'bg-slate-800 border-emerald-500/60 shadow-glow-emerald text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <div className="text-left">
                    <div className="font-bold">UPI 1-Tap (Google Pay / PhonePe / Paytm)</div>
                    <div className="text-[10px] text-slate-400">Pre-authenticated recovery session</div>
                  </div>
                </div>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedMethod === 'upi' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                  {selectedMethod === 'upi' && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                </div>
              </button>

              {/* Cards Option */}
              <button
                type="button"
                onClick={() => setSelectedMethod('card')}
                className={`w-full p-3 rounded-xl border flex items-center justify-between text-xs transition-all ${
                  selectedMethod === 'card'
                    ? 'bg-slate-800 border-emerald-500/60 shadow-glow-emerald text-white'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <CreditCard className="w-4 h-4 text-cyan-400" />
                  <div className="text-left">
                    <div className="font-bold">Debit / Credit Card</div>
                    <div className="text-[10px] text-slate-400">Alternative rail for limit decline</div>
                  </div>
                </div>
                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${selectedMethod === 'card' ? 'border-emerald-400 bg-emerald-400' : 'border-slate-600'}`}>
                  {selectedMethod === 'card' && <div className="w-1.5 h-1.5 bg-slate-950 rounded-full" />}
                </div>
              </button>
            </div>

            {/* Pay Button */}
            <div className="pt-2">
              <button
                onClick={handlePay}
                disabled={processing}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 hover:from-emerald-300 text-slate-950 font-bold text-sm shadow-glow-emerald transition-all flex items-center justify-center gap-2"
              >
                {processing ? (
                  <>Processing UPI Authorization...</>
                ) : (
                  <>
                    <Lock className="w-4 h-4" /> Pay ₹{amount.toLocaleString('en-IN')} with Razorpay
                  </>
                )}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-slate-500 font-mono pt-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 256-Bit Encrypted • Powered by Razorpay
            </div>

          </div>
        )}

      </div>
    </div>
  );
};
