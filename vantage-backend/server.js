require('dotenv').config();

const express    = require('express');
const helmet     = require('helmet');
const cors       = require('cors');
const rateLimit  = require('express-rate-limit');
const logger     = require('./config/logger');
const errorHandler = require('./middlewares/errorHandler');

// ── Routes ────────────────────────────────────────────────
const discoveryRoutes = require('./routes/discovery.routes');
const casesRoutes     = require('./routes/cases.routes');
const reportsRoutes   = require('./routes/reports.routes');
const assetsRoutes    = require('./routes/assets.routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ── Security headers ──────────────────────────────────────
app.use(helmet());

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-vantage-key']
}));

// ── Body parsing ──────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));

// ── Global rate limiter ───────────────────────────────────
app.use(rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60_000,
  max:      parseInt(process.env.RATE_LIMIT_MAX)        || 60,
  standardHeaders: true,
  legacyHeaders:   false,
  message: { error: 'Too many requests — please slow down' }
}));

// ── Request logger ────────────────────────────────────────
app.use((req, _res, next) => {
  logger.debug(`${req.method} ${req.path}`, { ip: req.ip });
  next();
});

// ── Health check ──────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'vantage-nexus', ts: new Date().toISOString() });
});

// ── API routes ────────────────────────────────────────────
app.use('/api/discovery', discoveryRoutes);
app.use('/api/cases',     casesRoutes);
app.use('/api/reports',   reportsRoutes);
app.use('/api/assets',    assetsRoutes);

// ── 404 handler ───────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Central error handler ─────────────────────────────────
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`VANTAGE Nexus API running on port ${PORT}`, {
    env:  process.env.NODE_ENV || 'development',
    port: PORT
  });
});

module.exports = app;
