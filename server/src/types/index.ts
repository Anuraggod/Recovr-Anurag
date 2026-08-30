export type UPIDeclineCode = 
  | 'U30' // Insufficient Balance (Business Decline)
  | 'ZM'  // Invalid PIN / MPIN (Business Decline)
  | 'XB'  // Customer Drop-off / Cancelled by User (Business Decline)
  | 'U28' // Daily / Cumulative Transaction Limit Exceeded (Business Decline)
  | 'U16' // Risk Threshold / Suspected Velocity (Business Decline)
  | 'ZA'  // Inactive Account / Dormant (Technical / Permanent)
  | 'U69' // Acquirer Bank Server Unreachable (Technical)
  | 'TM'  // Technical Timeout from NPCI (Technical)
  | 'K100'; // Risk Blacklisted (Permanent)

export type DeclineType = 'BUSINESS_DECLINE' | 'TECHNICAL_DECLINE';

export type RecoveryStrategy = 
  | 'INSTANT_PAYMENT_LINK'
  | 'TIMED_RECOVERY_NUDGE'
  | 'ALTERNATIVE_METHOD_SUGGESTION'
  | 'NO_ACTION_TECHNICAL_FAILURE';

export type TransactionStatus = 
  | 'failed' 
  | 'recovered' 
  | 'abandoned' 
  | 'pending' 
  | 'cancelled_self_recovered';

export type NudgeStatus = 
  | 'queued' 
  | 'sent' 
  | 'delivered' 
  | 'clicked' 
  | 'recovered' 
  | 'cancelled_self_recovered';

export type NudgeChannel = 'whatsapp' | 'sms' | 'in_app';

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  upi_id?: string;
  historical_orders_count: number;
  historical_success_rate: number;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  merchant_id: string;
  merchant_name: string;
  amount_in_paise: number;
  currency: string;
  order_id?: string;
  razorpay_payment_id?: string;
  status: TransactionStatus;
  payment_method: string;
  created_at: string;
  updated_at: string;
}

export interface FailureEvent {
  id: string;
  transaction_id: string;
  error_code: string;
  upi_decline_code: UPIDeclineCode | string;
  error_description: string;
  error_source: 'customer' | 'bank' | 'gateway';
  error_step: string;
  raw_payload?: Record<string, any>;
  occurred_at: string;
}

export interface FeatureSignals {
  decline_code_weight: number;
  customer_loyalty_boost: number;
  amount_sensitivity_factor: number;
  hour_of_day_penalty: number;
  failure_frequency_penalty: number;
  base_probability: number;
}

export interface RecoveryPrediction {
  id: string;
  transaction_id: string;
  is_recoverable: boolean;
  decline_type: DeclineType;
  confidence_score: number;
  recommended_strategy: RecoveryStrategy;
  optimal_retry_delay_seconds: number;
  predicted_optimal_time: string;
  feature_signals: FeatureSignals;
  created_at: string;
}

export interface NudgeSent {
  id: string;
  transaction_id: string;
  prediction_id: string;
  channel: NudgeChannel;
  recipient_phone: string;
  message_content: string;
  razorpay_payment_link_id?: string;
  razorpay_payment_link_url?: string;
  status: NudgeStatus;
  scheduled_for: string;
  sent_at?: string;
  recovered_at?: string;
  created_at: string;
}

export interface EnrichedTransaction extends Transaction {
  user?: User;
  failure_event?: FailureEvent;
  prediction?: RecoveryPrediction;
  nudges?: NudgeSent[];
}

export interface RecoverySimulationInput {
  merchant_name: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  amount_in_rupees: number;
  upi_decline_code: UPIDeclineCode;
  historical_success_rate?: number;
  historical_orders_count?: number;
  custom_failure_reason?: string;
}

export interface AnalyticsMetrics {
  total_failed_count: number;
  total_failed_volume_in_paise: number;
  total_recovered_count: number;
  total_recovered_volume_in_paise: number;
  business_decline_count: number;
  business_decline_recovery_rate_pct: number;
  overall_recovery_rate_pct: number;
  average_recovery_time_minutes: number;
  decline_breakdown: Record<string, number>;
  channel_effectiveness: {
    whatsapp: { sent: number; recovered: number; rate: number };
    sms: { sent: number; recovered: number; rate: number };
  };
}
