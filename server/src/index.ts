import express from 'express';
import cors from 'cors';
import { config } from './config/env';
import { initDatabase } from './db/db';
import { seedRealisticData } from './db/seed';
import webhookRoutes from './routes/webhook.routes';
import recoveryRoutes from './routes/recovery.routes';
import analyticsRoutes from './routes/analytics.routes';

const app = express();

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-razorpay-signature'],
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Recovr AI Recovery Engine',
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
    groqConfigured: config.groq.isConfigured,
    razorpayConfigured: config.razorpay.isLive,
  });
});

// Register API Routes
app.use('/api/webhooks', webhookRoutes);
app.use('/api/recovery', recoveryRoutes);
app.use('/api/analytics', analyticsRoutes);

// Server startup
async function bootstrap() {
  try {
    await initDatabase();
    await seedRealisticData();

    app.listen(config.port, () => {
      console.log(`\n======================================================`);
      console.log(`🚀 RECOVR AI ENGINE SERVER RUNNING ON PORT ${config.port}`);
      console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
      console.log(`⚡ Razorpay Webhooks: http://localhost:${config.port}/api/webhooks/razorpay`);
      console.log(`🤖 Groq Model: ${config.groq.model} (Configured: ${config.groq.isConfigured})`);
      console.log(`======================================================\n`);
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap Recovr server:', error);
    process.exit(1);
  }
}

bootstrap();
