import { FailureClassifierService } from '../src/services/classifier.service';
import { RecoveryTimingPredictorService } from '../src/services/timing.service';
import { GroqNudgeService } from '../src/services/groq.service';
import { RazorpayService } from '../src/services/razorpay.service';

async function runTests() {
  console.log('🧪 Starting Recovr AI Pipeline Tests...\n');
  let passed = 0;
  let total = 0;

  function assert(condition: boolean, testName: string) {
    total++;
    if (condition) {
      console.log(`✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${testName}`);
    }
  }

  // 1. Classifier Test: Insufficient balance (U30) should be classified as Business Decline and Recoverable
  const resU30 = FailureClassifierService.classify({
    upi_decline_code: 'U30',
    error_source: 'customer',
    amount_in_paise: 99900,
    user_historical_success_rate: 0.90,
  });
  assert(resU30.is_recoverable === true, 'U30 Classified as Recoverable');
  assert(resU30.decline_type === 'BUSINESS_DECLINE', 'U30 Classified as BUSINESS_DECLINE');
  assert(resU30.confidence_score >= 0.70, 'U30 Confidence score >= 0.70');

  // 2. Classifier Test: Invalid MPIN (ZM) should recommend INSTANT_PAYMENT_LINK
  const resZM = FailureClassifierService.classify({
    upi_decline_code: 'ZM',
    error_source: 'customer',
    amount_in_paise: 45000,
  });
  assert(resZM.is_recoverable === true, 'ZM (Wrong PIN) is Recoverable');
  assert(resZM.recommended_strategy === 'INSTANT_PAYMENT_LINK', 'ZM Strategy is INSTANT_PAYMENT_LINK');

  // 3. Classifier Test: Dormant account (ZA) should be Technical / Non-recoverable
  const resZA = FailureClassifierService.classify({
    upi_decline_code: 'ZA',
    error_source: 'bank',
    amount_in_paise: 20000,
  });
  assert(resZA.is_recoverable === false, 'ZA (Dormant) is Non-Recoverable');
  assert(resZA.decline_type === 'TECHNICAL_DECLINE', 'ZA is TECHNICAL_DECLINE');

  // 4. Timing Predictor Test: ZM should have short retry window (~180s)
  const timingZM = RecoveryTimingPredictorService.predict({
    upi_decline_code: 'ZM',
    amount_in_paise: 45000,
    strategy: 'INSTANT_PAYMENT_LINK',
  });
  assert(timingZM.optimal_retry_delay_seconds <= 300, 'ZM timing delay is within short 5m window');

  // 5. Razorpay Link Generator Test
  const link = await RazorpayService.createRecoveryPaymentLink({
    amountInPaise: 49900,
    description: 'Test order',
    customer: { name: 'Rahul', email: 'rahul@test.com', contact: '+919999999999' },
  });
  assert(link.short_url.includes('rzp.io'), 'Razorpay link generated with rzp.io domain');

  // 6. Groq Nudge Generation Test
  const nudge = await GroqNudgeService.generateRecoveryNudge({
    customerName: 'Aarav',
    merchantName: 'Zomato',
    amountInRupees: 650,
    upiDeclineCode: 'U30',
    recoveryPaymentUrl: link.short_url,
    strategy: 'TIMED_RECOVERY_NUDGE',
  });
  assert(nudge.whatsapp_message.includes('Zomato'), 'Nudge includes merchant name');
  assert(nudge.whatsapp_message.includes('650'), 'Nudge includes amount in INR');
  assert(nudge.sms_message.length <= 160, 'SMS message is <= 160 chars');

  console.log(`\n🎉 Test Suite Completed: ${passed}/${total} tests passed!`);
  if (passed !== total) process.exit(1);
}

runTests().catch(console.error);
