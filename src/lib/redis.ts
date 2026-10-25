import Redis from 'ioredis';
import { env } from '../config/env';

export const redis = new Redis(env.REDIS_URL);

redis.on('error', (err) => console.error('Lỗi Redis:', err.message));