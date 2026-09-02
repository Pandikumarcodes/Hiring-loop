import express from 'express';
import cors from 'cors';

import { config } from './config/env.js';
import { errorHandler } from './middleware/error-handler.js';
import { notFoundMiddleware } from './middleware/not-found.js';
import { requestCorrelationMiddleware } from './middleware/request-correlation.js';
import { createOriginValidationMiddleware } from './middleware/origin-validation.js';
import apiV1Router from './routes/api-v1.js';

const app = express();

// Keep forwarded client IPs untrusted until the deployment proxy contract is
// explicitly configured. This prevents arbitrary X-Forwarded-For spoofing.
app.set('trust proxy', false);
app.use(requestCorrelationMiddleware);
app.use(
  cors({
    origin: (origin, callback) =>
      callback(null, origin ? origin === config.frontendOrigin : false),
    credentials: true,
    methods: ['GET', 'HEAD', 'OPTIONS', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'X-Request-ID', 'X-CSRF-Token'],
    optionsSuccessStatus: 204,
  }),
);
app.use(
  createOriginValidationMiddleware({
    allowedOrigin: config.frontendOrigin,
    requireOrigin: config.environment === 'production',
  }),
);
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/v1', apiV1Router);

app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
