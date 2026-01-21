import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { env } from './config/env';
import routes from './routes';
import { errorHandler, notFoundHandler } from './middlewares/errorHandler';
import { requestLogger } from './middlewares/requestLogger';

const app = express();

// ══════════════════════════════════════════════════════════════════════════
// SECURITY MIDDLEWARES
// ══════════════════════════════════════════════════════════════════════════

// Helmet - Security headers
app.use(helmet());

// CORS
app.use(cors({
  origin: env.CORS_ORIGIN === '*' ? '*' : env.CORS_ORIGIN.split(','),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// ══════════════════════════════════════════════════════════════════════════
// PARSING MIDDLEWARES
// ══════════════════════════════════════════════════════════════════════════

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ══════════════════════════════════════════════════════════════════════════
// LOGGING
// ══════════════════════════════════════════════════════════════════════════

app.use(requestLogger);

// ══════════════════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════════════════

// API routes
app.use('/api', routes);

// Root health check
app.get('/', (req, res) => {
  res.json({
    name: 'Nova Player API',
    version: '1.0.0',
    status: 'running',
  });
});

// ══════════════════════════════════════════════════════════════════════════
// ERROR HANDLING
// ══════════════════════════════════════════════════════════════════════════

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
