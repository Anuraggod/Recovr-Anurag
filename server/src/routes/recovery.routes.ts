import { Router } from 'express';
import { RecoveryController } from '../controllers/recovery.controller';

const router = Router();

router.get('/stream', RecoveryController.streamEvents);
router.post('/simulate', RecoveryController.simulateFailure);
router.post('/verify/:paymentLinkId', RecoveryController.verifyPaymentLink);
router.post('/self-recover/:transactionId', RecoveryController.triggerSelfRecovery);
router.post('/retry/:nudgeId', RecoveryController.forceDispatchNudge);

export default router;
