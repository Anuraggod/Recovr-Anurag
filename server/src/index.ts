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
    const server = app.listen(config.port, async () => {
      console.log(`\n======================================================`);
      console.log(`🚀 RECOVR AI ENGINE SERVER RUNNING ON PORT ${config.port}`);
      console.log(`📡 Health Check: http://localhost:${config.port}/api/health`);
      console.log(`⚡ Razorpay Webhooks: http://localhost:${config.port}/api/webhooks/razorpay`);
      console.log(`🤖 Groq Model: ${config.groq.model} (Live Configured: ${config.groq.isConfigured})`);
      console.log(`======================================================\n`);

      await initDatabase();
      await seedRealisticData();
    });

    server.on('error', (err: any) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`\n❌ Error: Port ${config.port} is already in use by another process.`);
        console.error(`👉 Tip: Stop any existing server running on port ${config.port} or change PORT in .env.\n`);
      } else {
        console.error('❌ Server error:', err);
      }
    });
  } catch (error) {
    console.error('❌ Failed to bootstrap Recovr server:', error);
  }
}

bootstrap();
