/**
 * ══════════════════════════════════════════════════════
 *  NOVA AI — Financial Advisor Backend
 *  Node.js + Express + OpenAI
 *  NovaPesa | #GrowBeyond
 * ══════════════════════════════════════════════════════
 */

require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const rateLimit = require('express-rate-limit');
const chatController    = require('./controllers/chatController');
const analyzeController = require('./controllers/analyzeController');
const planController    = require('./controllers/planController');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── CORS ────────────────────────────────────────────
// In production, restrict to your actual frontend URL
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500', 'http://127.0.0.1:5500'];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || allowedOrigins.includes('*')) {
      return callback(null, true);
    }
    callback(new Error(`CORS: Origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// ─── MIDDLEWARE ───────────────────────────────────────
app.use(express.json({ limit: '10kb' }));      // Body parser with size limit
app.use(express.urlencoded({ extended: false }));

// ─── RATE LIMITING ────────────────────────────────────
const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 30,                    // 30 AI requests per 15 min per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please wait a few minutes and try again.' },
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,        // 1 minute
  max: 60,                    // 60 global requests per minute per IP
  message: { error: 'Rate limit exceeded. Please slow down.' },
});

app.use(globalLimiter);

// ─── HEALTH CHECK ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Nova AI Backend',
    version: '1.0.0',
    brand: 'NovaPesa',
    timestamp: new Date().toISOString(),
  });
});

// ─── AI ROUTES ────────────────────────────────────────
// POST /chat    — AI financial chat
// POST /analyze — Financial data analysis
// POST /plan    — 90-day plan generation

app.post('/chat',    aiLimiter, chatController.chat);
app.post('/analyze', aiLimiter, analyzeController.analyze);
app.post('/plan',    aiLimiter, planController.generatePlan);

// ─── 404 HANDLER ─────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// ─── ERROR HANDLER ────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[Nova AI Error]', err.message);

  // Don't leak stack traces in production
  const message = process.env.NODE_ENV === 'production'
    ? 'An internal server error occurred.'
    : err.message;

  res.status(err.status || 500).json({ error: message });
});

// ─── START ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n✦ Nova AI Backend running on port ${PORT}`);
  console.log(`  Health: http://localhost:${PORT}/health`);
  console.log(`  Mode: ${process.env.NODE_ENV || 'development'}\n`);
});
