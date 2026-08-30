import { Router } from 'express';
import { AnalyticsController } from '../controllers/analytics.controller';

const router = Router();

router.get('/metrics', AnalyticsController.getMetrics);
router.get('/transactions', AnalyticsController.getTransactions);
router.get('/transactions/:id', AnalyticsController.getTransactionById);

export default router;
