
import express from 'express';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { apiRoutes } from './routes';
export const app = express();


app.use(express.json());


app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.use('/api/v1', apiRoutes);


app.use(notFound);
app.use(errorHandler);
