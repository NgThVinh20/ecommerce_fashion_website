
import { env } from './config/env';
import { app } from './app';
import { prisma } from './lib/prisma';

const server = app.listen(env.PORT, () => {
  console.log(`Server đang chạy tại http://localhost:${env.PORT}`);
});


