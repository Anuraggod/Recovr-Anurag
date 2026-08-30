-- =========================================================
-- RECOVR POSTGRESQL SCHEMA DDL
-- AI-Powered UPI Payment Failure Recovery Engine
-- =========================================================

-- 1. Users / Customers Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    phone VARCHAR(32) NOT NULL,
    upi_id VARCHAR(128),
    historical_orders_count INT DEFAULT 0,
    historical_success_rate FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    merchant_id VARCHAR(64) NOT NULL,
    merchant_name VARCHAR(255) NOT NULL,
    amount_in_paise INT NOT NULL, -- e.g., 49900 = ₹499.00
    currency VARCHAR(8) DEFAULT 'INR',
    order_id VARCHAR(128),
    razorpay_payment_id VARCHAR(128),
    status VARCHAR(32) NOT NULL, -- 'failed', 'recovered', 'abandoned', 'pending', 'cancelled_self_recovered'
    payment_method VARCHAR(32) DEFAULT 'upi', -- 'upi_intent', 'upi_collect', 'upi_qr'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Failure Events Table
CREATE TABLE IF NOT EXISTS failure_events (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) REFERENCES transactions(id) ON DELETE CASCADE,
    error_code VARCHAR(64) NOT NULL,       -- e.g. 'BAD_REQUEST_ERROR', 'PAYMENT_FAILED'
    upi_decline_code VARCHAR(32),          -- e.g. 'U30' (Insufficient balance), 'ZM' (Wrong PIN), 'U28' (Limit exceeded), 'XB' (User timeout)
    error_description TEXT,
    error_source VARCHAR(64),              -- 'customer', 'bank', 'gateway'
    error_step VARCHAR(64),                -- 'payment_authorization', 'payment_initiation'
    raw_payload JSONB,
    occurred_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Recovery Predictions Table
CREATE TABLE IF NOT EXISTS recovery_predictions (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) REFERENCES transactions(id) ON DELETE CASCADE,
    is_recoverable BOOLEAN NOT NULL,
    decline_type VARCHAR(64) NOT NULL,     -- 'BUSINESS_DECLINE' vs 'TECHNICAL_DECLINE'
    confidence_score FLOAT NOT NULL,       -- 0.00 to 1.00
    recommended_strategy VARCHAR(64),      -- 'INSTANT_PAYMENT_LINK', 'TIMED_RECOVERY_NUDGE', 'ALTERNATIVE_METHOD_SUGGESTION'
    optimal_retry_delay_seconds INT,       -- e.g., 300 (5m), 900 (15m), 7200 (2 hrs)
    predicted_optimal_time TIMESTAMP WITH TIME ZONE NOT NULL,
    feature_signals JSONB,                 -- Signal factors (failure count, time of day, amount bucket, user history)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Nudges Sent Table
CREATE TABLE IF NOT EXISTS nudges_sent (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) REFERENCES transactions(id) ON DELETE CASCADE,
    prediction_id VARCHAR(64) REFERENCES recovery_predictions(id) ON DELETE CASCADE,
    channel VARCHAR(32) NOT NULL,          -- 'whatsapp', 'sms', 'in_app'
    recipient_phone VARCHAR(32) NOT NULL,
    message_content TEXT NOT NULL,
    razorpay_payment_link_id VARCHAR(128),
    razorpay_payment_link_url TEXT,
    status VARCHAR(32) DEFAULT 'sent',     -- 'queued', 'sent', 'delivered', 'clicked', 'recovered', 'cancelled_self_recovered'
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    sent_at TIMESTAMP WITH TIME ZONE,
    recovered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for lightning fast queries & dashboard feeds
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_failure_events_tx ON failure_events(transaction_id);
CREATE INDEX IF NOT EXISTS idx_predictions_tx ON recovery_predictions(transaction_id);
CREATE INDEX IF NOT EXISTS idx_nudges_status ON nudges_sent(status);
