import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import pinoHttp from 'pino-http';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import logger from './lib/logger';
import authRouter from './routes/auth';
import tasksRouter from './routes/tasks';
import settingsRouter from './routes/settings';
import telegramRouter from './routes/telegram';
import { errorHandler } from './middleware/errorHandler';
import { csrfProtection } from './middleware/csrf';

export const app = express();

app.use(
  helmet({
    frameguard: { action: 'deny' },
  }),
);
app.use(cors({ origin: config.FRONTEND_URL, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(pinoHttp({ logger }));
app.use('/uploads', express.static(config.UPLOAD_DIR));

// General API rate limit — applied before CSRF and route handlers
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later' },
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api', apiLimiter);
app.use('/api', csrfProtection);

app.use('/api/auth', authRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/telegram', telegramRouter);
app.use('/api/settings', settingsRouter);

app.use(errorHandler);

export default app;
