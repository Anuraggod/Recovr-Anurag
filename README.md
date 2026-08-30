# Recovr — AI-Powered UPI Payment Failure Recovery Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](https://opensource.org/licenses/MIT)
[![Razorpay Stack](https://img.shields.io/badge/Payments-Razorpay-blue.svg)](https://razorpay.com)
[![Groq LPU](https://img.shields.io/badge/AI-Groq%20Llama%203.3%2070B-purple.svg)](https://groq.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178c6.svg)](https://www.typescriptlang.org/)
[![React + Vite](https://img.shields.io/badge/Frontend-React%2018%20%2B%20Vite-61dafb.svg)](https://vitejs.dev/)

Recovr is an intelligent recovery engine designed to tackle **"Business Decline" (BD)** UPI payment failures (insufficient bank balance, incorrect MPIN, user abandonment, or daily limit fatigue) on the Razorpay stack. Instead of letting revenue slip away or spamming customers immediately, Recovr:

1. **Classifies** failures into Recoverable Business Declines vs Non-Recoverable Technical Declines using a probabilistic feature scorer.
2. **Predicts** the optimal recovery window ($T_{\text{optimal}}$) using behavioral signals, cart value, and time-of-day sleep-window buffering.
3. **Generates & Dispatches** hyper-personalized recovery nudges with dynamic Razorpay 1-tap recovery links via Groq-powered fast LLM inference (`llama-3.3-70b-versatile`).
4. **Guards Against Spam**: Intercepts `payment.captured` webhooks when a customer self-recovers and cancels scheduled nudges automatically.
5. **Streams Live Telemetry**: Full real-time telemetry dashboard with live failure feed, visual AI pipeline trace, and interactive customer phone simulator.

---

## 🏛️ Architecture Overview

```
                                  +---------------------------------------------+
                                  |            Razorpay Gateway                 |
                                  |   (Payment Failed Webhook / Links API)      |
                                  +--------------------+------------------------+
                                                       |
                              Webhook Event:           |
                     payment.failed (UPI decline)      | API: Create 1-Tap Recovery Link
                                                       v
+-----------------------------------------------------------------------------------+
|                               RECOVR BACKEND ENGINE                               |
|                                                                                   |
|  +------------------------+      +--------------------+     +-------------------+ |
|  | Webhook Ingestion &    | ---> | AI Failure         | --> | Recovery Timing   | |
|  | HMAC SHA256 Validator  |      | Classifier         |     | Predictor         | |
|  +------------------------+      +--------------------+     +-------------------+ |
|                                                                       |           |
|                                                                       v           |
|  +------------------------+      +--------------------+     +-------------------+ |
|  | Multi-Channel Nudge    | <--- | Groq LLM Nudge     | <-- | Razorpay Link     | |
|  | Dispatcher (WA/SMS)    |      | Synthesizer (70B)  |     | Generator Engine  | |
|  +------------------------+      +--------------------+     +-------------------+ |
|              |                                                        |           |
|              +--------------------------+-----------------------------+           |
|                                         |                                         |
|                                         v                                         |
|                           +---------------------------+                           |
|                           |  PostgreSQL Database      |                           |
|                           |  (Dual-Mode Resilient)    |                           |
|                           +---------------------------+                           |
|                                         |                                         |
+-----------------------------------------|-----------------------------------------+
                                          | Real-time Server-Sent Events (SSE)
                                          v
+-----------------------------------------------------------------------------------+
|                           RECOVR FRONTEND DASHBOARD                               |
|                                                                                   |
|  * Live Recovery Telemetry Feed (Real-time incoming failure events)               |
|  * 4-Stage AI Pipeline Trace (Ingestion -> Classifier -> Timing -> Groq Nudge)    |
|  * Interactive Simulation Sandbox (Trigger custom UPI failure scenarios)          |
|  * Interactive WhatsApp & SMS Mobile Phone Mockup with 1-Tap Razorpay Checkout    |
|  * Self-Recovery Guard (Demonstrates auto-cancellation of pending nudges)         |
+-----------------------------------------------------------------------------------+
```

---

## 🤖 The Triple AI Engine

### 1. Probabilistic Failure Classifier
* **Signal Inputs**: UPI decline codes (`U30` balance, `ZM` wrong PIN, `XB` drop-off, `U28` daily limit, `ZA` dormant), customer historical success rate, cart value, and error source.
* **Output**: `is_recoverable` (boolean), `decline_type` (`BUSINESS_DECLINE` vs `TECHNICAL_DECLINE`), `confidence_score` (0.00 to 1.00), and `feature_signals` trace.
* **Extensibility**: Architected as a modular scoring engine designed for drop-in replacement with offline-trained Gradient Boosted / Logistic Regression models on production merchant logs.

### 2. Recovery-Timing Predictor
* **Objective**: Determines cooldown delay $\Delta t$ to maximize recovery conversion while eliminating customer friction.
* **Cooldown Math**:
  * **Wrong MPIN (`ZM`)**: 3-minute cooldown (customer has device in hand; preserves buying momentum).
  * **Low Balance (`U30`)**: 60-minute window (allows user to top-up bank account or transfer funds).
  * **User Abandonment (`XB`)**: 15-minute cart preservation window.
  * **Limit Exceeded (`U28`)**: 4-hour cooldown or alternative payment rail suggestion.
* **Do-Not-Disturb Night Protection**: Automatically defers recovery nudges scheduled during 11:00 PM – 7:00 AM to 8:30 AM next morning.

### 3. Groq LLM Nudge Synthesizer
* **Model**: Groq-hosted `llama-3.3-70b-versatile` (sub-200ms ultra-fast inference).
* **Dual Output**:
  * **WhatsApp**: Rich formatting, emojis, polite tone acknowledging the issue without embarrassment, and single-tap Razorpay recovery action button.
  * **SMS**: 160-character compliant concise notification with direct recovery link.
* **Fallback Synthesizer**: Embedded algorithmic fallback ensures 100% uptime even in offline or rate-limited scenarios.

---

## 🛡️ Self-Recovery & Spam Prevention Guard

When a customer encounters a payment failure and retries on their own outside the nudge, Razorpay emits a `payment.captured` webhook. Recovr matches the order ID and immediately cancels any queued or pending recovery nudges (`status: 'cancelled_self_recovered'`), guaranteeing that customers who already paid are **never spammed**.

---

## 🚀 Quickstart & Local Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: (Optional) Standard PostgreSQL or cloud database (Neon/Supabase). If not configured, Recovr automatically uses its built-in resilient in-memory storage.

### 1. Clone & Configure
```bash
git clone https://github.com/Anuraggod/Recovr-Anurag.git
cd Recovr-Anurag

# Copy example environment configuration
cp .env.example .env
```

Edit `.env` if you wish to add your real Razorpay or Groq API keys:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/recovr_db
RAZORPAY_KEY_ID=rzp_test_your_key_id
RAZORPAY_KEY_SECRET=your_razorpay_secret
GROQ_API_KEY=gsk_your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
```

### 2. Install Dependencies
```bash
# Install backend dependencies
cd server && npm install && cd ..

# Install frontend dependencies
cd client && npm install && cd ..
```

### 3. Run AI Pipeline Test Suite
```bash
cd server && npm test && cd ..
```

### 4. Start Development Servers
```bash
# Terminal 1: Backend Server (Port 5000)
cd server && npm run dev

# Terminal 2: Frontend Dashboard (Port 5173)
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## 📡 API Reference

### Webhooks
- `POST /api/webhooks/razorpay` — Ingests `payment.failed` and `payment.captured` webhooks with HMAC SHA256 signature verification.

### Recovery Engine
- `GET /api/recovery/stream` — Real-time Server-Sent Events (SSE) telemetry feed.
- `POST /api/recovery/simulate` — Ingests custom UPI failure scenarios and executes the 4-stage AI pipeline.
- `POST /api/recovery/verify/:paymentLinkId` — Confirms customer payment via 1-tap link and transitions state to `recovered`.
- `POST /api/recovery/self-recover/:transactionId` — Demonstrates auto-cancellation of scheduled nudges on self-recovery.

### Analytics
- `GET /api/analytics/metrics` — Returns total recovered revenue (₹), BD recovery rate %, breakdown by error code, and channel conversion.
- `GET /api/analytics/transactions` — Returns paginated list of transactions with full relational trace.

---

## 📂 Project Structure

```
Recovr/
├── .env.example                  # Environment configuration template
├── LICENSE                       # MIT License
├── README.md                     # Documentation
├── package.json                  # Root orchestration
├── server/                       # Node.js + Express + TypeScript Backend
│   ├── src/
│   │   ├── index.ts              # Server bootstrap & SSE handler
│   │   ├── config/env.ts         # Typed config reader
│   │   ├── db/                   # Database layer (PostgreSQL + In-memory adapter)
│   │   │   ├── schema.sql        # PostgreSQL DDL
│   │   │   ├── db.ts             # Relational data access
│   │   │   └── seed.ts           # Realistic seed generator
│   │   ├── services/             # Core AI & Payment services
│   │   │   ├── classifier.service.ts   # Rule-seeded probabilistic classifier
│   │   │   ├── timing.service.ts       # Recovery timing predictor
│   │   │   ├── groq.service.ts         # Groq LPU Llama 3.3 70B nudge synthesizer
│   │   │   ├── razorpay.service.ts     # Razorpay 1-Tap Links & HMAC verification
│   │   │   └── notification.service.ts # Multi-channel dispatch & spam guard
│   │   ├── controllers/          # API route handlers
│   │   └── routes/               # Express endpoints
│   └── tests/
│       └── ai_pipeline.test.ts   # 12-point unit test suite
└── client/                       # React 18 + Vite + Tailwind Frontend
    ├── src/
    │   ├── components/
    │   │   ├── Navbar.tsx              # Brand header & live status
    │   │   ├── MetricsOverview.tsx     # KPI cards (₹ Recovered, BD Rate %)
    │   │   ├── LiveRecoveryFeed.tsx    # Real-time transaction stream
    │   │   ├── PipelineInspector.tsx   # 4-stage AI pipeline visualizer
    │   │   ├── MobileNudgePreview.tsx  # WhatsApp & SMS phone mockup
    │   │   ├── SimulatorModal.tsx      # Failure scenario sandbox
    │   │   ├── RecoveryCheckoutModal.tsx # Razorpay 1-tap checkout simulator
    │   │   └── SelfRecoveryDemoModal.tsx # Self-recovery demonstration
    │   ├── services/api.ts       # API client & SSE subscriber
    │   └── App.tsx               # Root application
```

---

## 📄 License
This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
