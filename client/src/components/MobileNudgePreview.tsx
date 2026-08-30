import React, { useState } from 'react';
import { EnrichedTransaction } from '../types/client';
import { MessageSquare, Smartphone, CheckCheck, ShieldCheck, Sparkles, ExternalLink } from 'lucide-react';

interface MobileNudgePreviewProps {
  transaction: EnrichedTransaction | null;
  onOpenCheckout: (paymentLinkId: string, amount: number, merchant: string) => void;
}

export const MobileNudgePreview: React.FC<MobileNudgePreviewProps> = ({
  transaction,
  onOpenCheckout,
}) => {
  const [channel, setChannel] = useState<'whatsapp' | 'sms'>('whatsapp');

  const nudge = transaction?.nudges?.[0];
  const amountRs = transaction ? Math.round(transaction.amount_in_paise / 100) : 499;
  const merchantName = transaction?.merchant_name || 'Swiggy Instamart';
  const customerName = transaction?.user?.name || 'Customer';
  const isRecovered = transaction?.status === 'recovered';
  const isSelfRecovered = transaction?.status === 'cancelled_self_recovered' || nudge?.status === 'cancelled_self_recovered';

  const defaultWhatsApp = `Hey ${customerName}! 👋\n\nWe noticed a quick bank timeout while checking out ₹${amountRs} at *${merchantName}*.\n\nYour cart is saved! Tap below to retry in 1-click:\n\n👉 *Pay ₹${amountRs} Now:* https://rzp.io/l/rcvr_demo\n\n_Secure UPI link powered by Razorpay_`;

  const defaultSMS = `Hi ${customerName}, your ₹${amountRs} payment to ${merchantName} was interrupted. Complete your order in 1 tap: https://rzp.io/l/rcvr_demo - Recovr`;

  const messageText = nudge?.message_content || (channel === 'whatsapp' ? defaultWhatsApp : defaultSMS);

  return (
    <div className="glass-panel rounded-2xl p-5 border border-slate-800/80 flex flex-col items-center">
      
      {/* Header & Mode Switcher */}
      <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-800/80">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono flex items-center gap-1.5">
            <Smartphone className="w-3.5 h-3.5 text-cyan-400" /> Customer Mobile Nudge
          </h4>
          <p className="text-[11px] text-slate-400 font-sans">Live simulation of customer recovery experience</p>
        </div>

        {/* Channel Switcher */}
        <div className="flex items-center gap-1 p-1 bg-slate-900 rounded-lg border border-slate-800">
          <button
            onClick={() => setChannel('whatsapp')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              channel === 'whatsapp'
                ? 'bg-emerald-500/20 text-emerald-300 font-semibold border border-emerald-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-3 h-3 text-emerald-400" /> WhatsApp
          </button>
          <button
            onClick={() => setChannel('sms')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
              channel === 'sms'
                ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3 h-3 text-cyan-400" /> SMS
          </button>
        </div>
      </div>

      {/* PHONE DEVICE FRAME */}
      <div className="w-full max-w-[320px] bg-slate-950 rounded-[38px] p-3 border-4 border-slate-800 shadow-2xl relative overflow-hidden">
        
        {/* Dynamic Island / Notch */}
        <div className="w-24 h-4 bg-slate-900 rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-2.5 h-2.5 rounded-full bg-slate-800"></div>
        </div>

        {/* Phone Screen Canvas */}
        <div className="bg-[#0b141a] rounded-[28px] overflow-hidden min-h-[460px] flex flex-col justify-between border border-slate-800/80">
          
          {channel === 'whatsapp' ? (
            /* WHATSAPP VIEW */
            <div className="flex-1 flex flex-col justify-between">
              
              {/* WhatsApp App Header */}
              <div className="bg-[#1f2c34] p-2.5 flex items-center justify-between border-b border-[#2a3942]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                    {merchantName.substring(0, 1)}
                  </div>
                  <div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs font-semibold text-white font-sans">{merchantName}</span>
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <span className="text-[9px] text-emerald-400 font-sans">Official Business Account</span>
                  </div>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">10:42 AM</span>
              </div>

              {/* Chat Bubble Area */}
              <div className="p-3 space-y-3 flex-1 flex flex-col justify-end bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:12px_12px]">
                
                {isSelfRecovered && (
                  <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/40 text-[10px] text-amber-300 text-center font-sans">
                    🛡️ Nudge cancelled automatically because customer already completed payment!
                  </div>
                )}

                <div className="bg-[#005c4b] p-3 rounded-2xl rounded-tl-sm text-white text-xs shadow-md space-y-2 border border-emerald-500/20">
                  <p className="whitespace-pre-line text-[11px] leading-relaxed font-sans">
                    {messageText}
                  </p>

                  {/* 1-Tap Recovery Button inside WhatsApp */}
                  <div className="pt-2 border-t border-emerald-600/50">
                    <button
                      onClick={() => onOpenCheckout(nudge?.razorpay_payment_link_id || 'plink_demo', amountRs, merchantName)}
                      className={`w-full py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-lg ${
                        isRecovered
                          ? 'bg-slate-700 text-slate-300 cursor-default'
                          : 'bg-emerald-400 text-slate-950 hover:bg-emerald-300 hover:scale-[1.02] active:scale-[0.98]'
                      }`}
                    >
                      {isRecovered ? (
                        <>✓ Paid & Recovered</>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5" /> Complete Payment ₹{amountRs}
                        </>
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-end gap-1 text-[9px] text-emerald-200/70 font-mono mt-1">
                    <span>10:42 AM</span>
                    <CheckCheck className="w-3 h-3 text-cyan-400" />
                  </div>
                </div>

              </div>

              {/* Input Bar */}
              <div className="bg-[#1f2c34] p-2 flex items-center gap-2 border-t border-[#2a3942]">
                <div className="flex-1 bg-[#2a3942] rounded-full px-3 py-1 text-[11px] text-slate-400 font-sans">
                  Tap button above to pay...
                </div>
              </div>

            </div>
          ) : (
            /* SMS VIEW */
            <div className="flex-1 flex flex-col justify-between bg-slate-900 p-3">
              <div className="text-center py-2 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-300">VK-RECOVR</span>
                <span className="text-[10px] text-slate-500 block">SMS Gateway</span>
              </div>

              <div className="space-y-3 my-auto">
                <div className="bg-slate-800 p-3.5 rounded-2xl rounded-tl-sm text-slate-100 text-xs border border-slate-700 space-y-2">
                  <p className="text-[11px] leading-relaxed font-sans">
                    {messageText}
                  </p>
                  <button
                    onClick={() => onOpenCheckout(nudge?.razorpay_payment_link_id || 'plink_demo', amountRs, merchantName)}
                    className="w-full py-1.5 px-2.5 rounded bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1"
                  >
                    Open Link (₹{amountRs}) <ExternalLink className="w-3 h-3" />
                  </button>
                  <span className="text-[9px] text-slate-400 font-mono block text-right">Just now</span>
                </div>
              </div>

              <div className="p-2 text-center text-[10px] text-slate-500">
                End-to-end encrypted notification
              </div>
            </div>
          )}

        </div>

        {/* Home Indicator */}
        <div className="w-28 h-1 bg-slate-700 rounded-full mx-auto mt-2"></div>
      </div>

    </div>
  );
};
