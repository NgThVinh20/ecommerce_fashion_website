import type { Request, Response } from 'express';
import { loginSchema, refreshSchema, registerSchema } from './auth.schema';
import * as authService from './auth.service';


export async function register(req: Request, res: Response) {
  const input = registerSchema.parse(req.body);
  const user = await authService.register(input);
  res.status(201).json({ data: user });
}

export async function login(req: Request, res: Response) {
  const input = loginSchema.parse(req.body);
  res.json({ data: await authService.login(input) });
}

export async function getMe(req: Request, res: Response) {
  res.json({ data: await authService.getMe(req.user!.sub) });
}

export async function refresh(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  res.json({ data: await authService.refresh(refreshToken) });
}

export async function logout(req: Request, res: Response) {
  const { refreshToken } = refreshSchema.parse(req.body);
  await authService.logout(refreshToken);
  res.status(204).end();
}