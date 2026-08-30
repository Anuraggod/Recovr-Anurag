import dotenv from 'dotenv';
import path from 'path';

// Load .env from root or server directory
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/recovr_db',
  
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo_key',
    keySecret: process.env.RAZORPAY_KEY_SECRET || 'demo_secret_key',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET || 'demo_webhook_secret',
    isLive: Boolean(process.env.RAZORPAY_KEY_ID && !process.env.RAZORPAY_KEY_ID.includes('placeholder') && !process.env.RAZORPAY_KEY_ID.includes('demo')),
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
    isConfigured: Boolean(process.env.GROQ_API_KEY && !process.env.GROQ_API_KEY.includes('placeholder') && process.env.GROQ_API_KEY.startsWith('gsk_')),
  },

  channels: {
    whatsappApiKey: process.env.WHATSAPP_API_KEY || '',
    whatsappPhoneId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    smsApiKey: process.env.SMS_PROVIDER_API_KEY || '',
  },

  jwtSecret: process.env.JWT_SECRET || 'recovr_default_dev_secret_key_32bytes_long',
};
