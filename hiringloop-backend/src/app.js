import express from 'express';

import { errorHandler } from './middleware/error-handler.js';
import { notFoundMiddleware } from './middleware/not-found.js';
import { requestCorrelationMiddleware } from './middleware/request-correlation.js';
import apiV1Router from './routes/api-v1.js';

const app = express();

app.use(requestCorrelationMiddleware);
app.use(express.json({ limit: '100kb' }));

app.get('/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.use('/api/v1', apiV1Router);

app.use(notFoundMiddleware);
app.use(errorHandler);

export default app;
