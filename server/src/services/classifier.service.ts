import { UPIDeclineCode, DeclineType, RecoveryStrategy, FeatureSignals } from '../types';

export interface ClassifierInput {
  upi_decline_code: UPIDeclineCode | string;
  error_source: 'customer' | 'bank' | 'gateway';
  amount_in_paise: number;
  user_historical_success_rate?: number;
  user_orders_count?: number;
}

export interface ClassifierResult {
  is_recoverable: boolean;
  decline_type: DeclineType;
  confidence_score: number;
  recommended_strategy: RecoveryStrategy;
  feature_signals: FeatureSignals;
  explanation: string;
}

// Rule-seeded feature scoring model
// Architected for seamless drop-in replacement with gradient-boosted / logistic models trained on merchant production datasets
export class FailureClassifierService {
  public static classify(input: ClassifierInput): ClassifierResult {
    const code = (input.upi_decline_code || '').toUpperCase();
    const successRate = input.user_historical_success_rate ?? 0.85;
    const ordersCount = input.user_orders_count ?? 3;
    const amountInRupees = input.amount_in_paise / 100;

    let baseProbability = 0.50;
    let declineCodeWeight = 0.0;
    let declineType: DeclineType = 'BUSINESS_DECLINE';
    let isRecoverable = true;
    let strategy: RecoveryStrategy = 'TIMED_RECOVERY_NUDGE';
    let explanation = '';

    switch (code) {
      case 'ZM': // Wrong PIN / MPIN entered
        baseProbability = 0.88;
        declineCodeWeight = 0.10;
        declineType = 'BUSINESS_DECLINE';
        isRecoverable = true;
        strategy = 'INSTANT_PAYMENT_LINK';
        explanation = 'Customer entered incorrect MPIN. High intent detected; instant 1-tap retry link recommended.';
        break;

      case 'U30': // Insufficient Funds
        baseProbability = 0.78;
        declineCodeWeight = 0.08;
        declineType = 'BUSINESS_DECLINE';
        isRecoverable = true;
        strategy = 'TIMED_RECOVERY_NUDGE';
        explanation = 'Insufficient bank balance. High recovery potential if nudged after account funding window.';
        break;

      case 'XB': // User Cancelled / Drop-off
        baseProbability = 0.82;
        declineCodeWeight = 0.06;
        declineType = 'BUSINESS_DECLINE';
        isRecoverable = true;
        strategy = 'TIMED_RECOVERY_NUDGE';
        explanation = 'Customer dropped off before completing biometric/PIN flow. Cart preservation nudge recommended.';
        break;

      case 'U28': // Exceeds Daily / Cumulative Transaction Limit
        baseProbability = 0.72;
        declineCodeWeight = 0.04;
        declineType = 'BUSINESS_DECLINE';
        isRecoverable = true;
        strategy = 'ALTERNATIVE_METHOD_SUGGESTION';
        explanation = 'UPI limit exceeded on selected bank. Recoverable via alternative bank account or card/netbanking link.';
        break;

      case 'U16': // Risk Threshold / High Frequency
        baseProbability = 0.65;
        declineCodeWeight = -0.05;
        declineType = 'BUSINESS_DECLINE';
        isRecoverable = true;
        strategy = 'TIMED_RECOVERY_NUDGE';
        explanation = 'Temporary bank velocity block. Cooldown buffer required before dispatching retry.';
        break;

      case 'ZA': // Account Inactive / Dormant
      case 'U69': // Bank Gateway Offline
      case 'TM': // NPCI Technical Timeout
      case 'K100': // Blacklisted
      default:
        baseProbability = 0.15;
        declineCodeWeight = -0.30;
        declineType = 'TECHNICAL_DECLINE';
        isRecoverable = false;
        strategy = 'NO_ACTION_TECHNICAL_FAILURE';
        explanation = 'Permanent or technical banking infrastructure decline. Auto-recovery suppressed to prevent friction.';
        break;
    }

    // Dynamic Feature Adjustments:
    // 1. Customer Loyalty & Historical Success Boost
    const customerLoyaltyBoost = (successRate - 0.5) * 0.15 + (Math.min(ordersCount, 10) / 10) * 0.05;

    // 2. Amount Sensitivity (High ticket items require slightly more caution; micro-items convert fast)
    let amountSensitivityFactor = 0.0;
    if (amountInRupees < 500) {
      amountSensitivityFactor = 0.04; // Micro-ticket impulse conversion
    } else if (amountInRupees > 10000) {
      amountSensitivityFactor = -0.06; // High ticket requires deliberation
    }

    // 3. Time of Day factor (Late night hours reduce immediate conversion)
    const currentHour = new Date().getHours();
    const isNightTime = currentHour >= 23 || currentHour < 7;
    const hourOfDayPenalty = isNightTime ? -0.05 : 0.02;

    // Compute final composite confidence score (clamped between 0.05 and 0.98)
    const rawScore = baseProbability + declineCodeWeight + customerLoyaltyBoost + amountSensitivityFactor + hourOfDayPenalty;
    const confidenceScore = Math.max(0.05, Math.min(0.98, Math.round(rawScore * 100) / 100));

    // Re-evaluate recoverability threshold
    if (confidenceScore < 0.40) {
      isRecoverable = false;
    }

    const featureSignals: FeatureSignals = {
      base_probability: Math.round(baseProbability * 100) / 100,
      decline_code_weight: Math.round(declineCodeWeight * 100) / 100,
      customer_loyalty_boost: Math.round(customerLoyaltyBoost * 100) / 100,
      amount_sensitivity_factor: Math.round(amountSensitivityFactor * 100) / 100,
      hour_of_day_penalty: Math.round(hourOfDayPenalty * 100) / 100,
      failure_frequency_penalty: 0.0,
    };

    return {
      is_recoverable: isRecoverable,
      decline_type: declineType,
      confidence_score: confidenceScore,
      recommended_strategy: strategy,
      feature_signals: featureSignals,
      explanation,
    };
  }
}
