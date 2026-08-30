import { Request, Response } from 'express';
import { db } from '../db/db';

export class AnalyticsController {
  public static async getMetrics(req: Request, res: Response): Promise<void> {
    try {
      const metrics = await db.getAnalyticsMetrics();
      res.status(200).json(metrics);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string || '50', 10);
      const transactions = await db.getAllTransactions(limit);
      res.status(200).json(transactions);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  public static async getTransactionById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const tx = await db.getTransactionDetails(id);
      if (!tx) {
        res.status(404).json({ error: 'Transaction not found' });
        return;
      }
      res.status(200).json(tx);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}
