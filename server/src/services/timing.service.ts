import { UPIDeclineCode, RecoveryStrategy } from '../types';

export interface TimingPredictionInput {
  upi_decline_code: UPIDeclineCode | string;
  amount_in_paise: number;
  strategy: RecoveryStrategy;
  user_historical_orders?: number;
}

export interface TimingPredictionResult {
  optimal_retry_delay_seconds: number;
  predicted_optimal_time: string;
  rationale: string;
  is_delayed_for_night_buffer: boolean;
}

export class RecoveryTimingPredictorService {
  public static predict(input: TimingPredictionInput): TimingPredictionResult {
    const code = (input.upi_decline_code || '').toUpperCase();
    const now = new Date();
    let delaySeconds = 300; // Default 5 mins
    let rationale = '';
    let isNightDelayed = false;

    switch (code) {
      case 'ZM': // Wrong PIN -> User is still on phone, prompt immediately after 3 mins
        delaySeconds = 180; // 3 minutes
        rationale = 'Customer likely still has device in hand. Short 3-min cooldown prevents PIN lockout while preserving momentum.';
        break;

      case 'U30': // Insufficient Funds -> Give user time to top-up bank account or transfer funds
        delaySeconds = 3600; // 1 hour
        rationale = 'Low bank balance requires fund transfer or salary credit. 1-hour window allows top-up without feeling pushy.';
        break;

      case 'XB': // User dropped off / abandoned
        delaySeconds = 900; // 15 minutes
        rationale = 'User was distracted or navigated away. 15-minute cart preservation window maximizes re-engagement.';
        break;

      case 'U28': // Exceeded daily limit
        delaySeconds = 14400; // 4 hours or next day
        rationale = 'Account limit reached. 4-hour window suggested or alternative payment rail offered.';
        break;

      case 'U16': // Risk / Velocity block
        delaySeconds = 1800; // 30 minutes
        rationale = 'Bank velocity cooldown period is typically 20-30 minutes before next attempt.';
        break;

      default:
        delaySeconds = 600; // 10 minutes
        rationale = 'Standard recovery retry window.';
        break;
    }

    // High cart value adaptation: (> ₹5000: allow extra 15 mins for consideration)
    if (input.amount_in_paise > 500000 && delaySeconds < 1800) {
      delaySeconds += 600;
      rationale += ' Extended slightly for high-value cart consideration.';
    }

    // Night time protection buffer (Indian Standard / Local time buffer: 11 PM to 7 AM)
    const targetDate = new Date(now.getTime() + delaySeconds * 1000);
    const targetHour = targetDate.getHours();

    if (targetHour >= 23 || targetHour < 7) {
      // Defer to next morning 8:30 AM
      const nextMorning = new Date(targetDate);
      if (targetHour >= 23) {
        nextMorning.setDate(nextMorning.getDate() + 1);
      }
      nextMorning.setHours(8, 30, 0, 0);
      delaySeconds = Math.max(delaySeconds, Math.floor((nextMorning.getTime() - now.getTime()) / 1000));
      isNightDelayed = true;
      rationale += ' Scheduled for 8:30 AM to respect customer do-not-disturb sleeping hours.';
    }

    const predictedOptimalTime = new Date(now.getTime() + delaySeconds * 1000).toISOString();

    return {
      optimal_retry_delay_seconds: delaySeconds,
      predicted_optimal_time: predictedOptimalTime,
      rationale,
      is_delayed_for_night_buffer: isNightDelayed,
    };
  }
}
