
import express from 'express';
import { errorHandler, notFound } from './middlewares/errorHandler';
import { authRoutes } from './modules/auth/auth.routes';
export const app = express();


app.use(express.json());


app.get('/health', (_req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});
app.use('/api/v1/auth', authRoutes);


app.use(notFound);
app.use(errorHandler);
