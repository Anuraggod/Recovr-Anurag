import Groq from 'groq-sdk';
import { config } from '../config/env';
import { UPIDeclineCode, RecoveryStrategy } from '../types';

export interface NudgePromptContext {
  customerName: string;
  merchantName: string;
  amountInRupees: number;
  upiDeclineCode: UPIDeclineCode | string;
  recoveryPaymentUrl: string;
  strategy: RecoveryStrategy;
  discountOffer?: string;
}

export interface GeneratedNudge {
  whatsapp_message: string;
  sms_message: string;
  tone: string;
  headline: string;
  model_used: string;
  generation_time_ms: number;
}

let groqClient: Groq | null = null;

if (config.groq.isConfigured) {
  try {
    groqClient = new Groq({ apiKey: config.groq.apiKey });
  } catch (err) {
    console.warn('⚠️ Groq client initialization warning:', err);
  }
}

export class GroqNudgeService {
  /**
   * Synthesizes personalized recovery nudges using Groq LPU LLM inference
   */
  public static async generateRecoveryNudge(context: NudgePromptContext): Promise<GeneratedNudge> {
    const startTime = Date.now();

    if (groqClient) {
      try {
        const systemPrompt = `You are Recovr AI, an empathetic and highly effective payment recovery assistant for Indian UPI checkouts on Razorpay.
Your job is to generate a concise, polite, and persuasive recovery nudge for a customer whose transaction just failed.
Guidelines:
1. Acknowledge the exact issue gracefully without causing embarrassment (e.g., for low balance: "quick bank limit or fund mismatch", for wrong PIN: "quick security PIN mismatch", for drop-off: "order was interrupted").
2. Provide a clear, single-tap call to action containing the EXACT recovery link provided.
3. Include merchant name "${context.merchantName}" and exact amount "₹${context.amountInRupees}".
4. Generate both:
   - whatsapp_message: Friendly, with emojis and crisp formatting (bullet or line breaks if helpful).
   - sms_message: Ultra-concise, strictly under 150 characters, includes link and merchant name.
5. Return ONLY a valid JSON object with keys: "whatsapp_message", "sms_message", "tone", "headline".`;

        const userPrompt = `Customer: ${context.customerName}
Merchant: ${context.merchantName}
Amount: ₹${context.amountInRupees}
Decline Code: ${context.upiDeclineCode}
Strategy: ${context.strategy}
Payment Link: ${context.recoveryPaymentUrl}
${context.discountOffer ? `Incentive: ${context.discountOffer}` : ''}

Generate the recovery nudge JSON now:`;

        const completion = await groqClient.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          model: config.groq.model || 'llama-3.3-70b-versatile',
          temperature: 0.5,
          response_format: { type: 'json_object' },
        });

        const content = completion.choices[0]?.message?.content;
        if (content) {
          const parsed = JSON.parse(content);
          const generationTimeMs = Date.now() - startTime;

          return {
            whatsapp_message: parsed.whatsapp_message || this.buildFallbackWhatsApp(context),
            sms_message: parsed.sms_message || this.buildFallbackSMS(context),
            tone: parsed.tone || 'empathetic_urgent',
            headline: parsed.headline || `Complete your ₹${context.amountInRupees} order at ${context.merchantName}`,
            model_used: `Groq (${config.groq.model})`,
            generation_time_ms: generationTimeMs,
          };
        }
      } catch (err: any) {
        console.warn('⚠️ Groq API request error, using smart fallback template:', err.message);
      }
    }

    // High quality dynamic fallback generator (used when offline or if GROQ_API_KEY is not configured)
    const generationTimeMs = Date.now() - startTime;
    return {
      whatsapp_message: this.buildFallbackWhatsApp(context),
      sms_message: this.buildFallbackSMS(context),
      tone: 'helpful_and_reassuring',
      headline: `Complete your ₹${context.amountInRupees} order at ${context.merchantName}`,
      model_used: 'Recovr Fast Synthesizer (Local/Groq Fallback)',
      generation_time_ms: Math.max(12, generationTimeMs),
    };
  }

  private static buildFallbackWhatsApp(ctx: NudgePromptContext): string {
    const code = (ctx.upiDeclineCode || '').toUpperCase();
    let issueContext = 'your bank encountered a temporary timeout';
    let tip = 'Your items are reserved in your cart.';

    if (code === 'ZM') {
      issueContext = 'there was a quick PIN mismatch on your UPI app';
      tip = 'No worries! You can retry instantly with 1-tap:';
    } else if (code === 'U30') {
      issueContext = 'your bank balance was temporarily insufficient';
      tip = 'Feel free to use another UPI account or card via this direct link:';
    } else if (code === 'U28') {
      issueContext = 'your daily bank UPI limit was reached';
      tip = 'You can easily complete this using Netbanking or Cards here:';
    } else if (code === 'XB') {
      issueContext = 'your payment checkout was interrupted';
      tip = 'We saved your cart so you won’t lose your spot:';
    }

    return `Hey ${ctx.customerName}! 👋\n\nWe noticed ${issueContext} while checking out ₹${ctx.amountInRupees} at *${ctx.merchantName}*.\n\n${tip}\n👉 *Tap to complete:* ${ctx.recoveryPaymentUrl}\n\n_Secure payment powered by Razorpay._`;
  }

  private static buildFallbackSMS(ctx: NudgePromptContext): string {
    return `Hi ${ctx.customerName}, your ₹${ctx.amountInRupees} payment at ${ctx.merchantName} was interrupted. Complete your order in 1 tap: ${ctx.recoveryPaymentUrl} - Recovr`;
  }
}
