import type { Request, Response } from 'express';
import {
  registerShopSchema, slugParamSchema, updateApplicationSchema, updateBankSchema, updateShopSchema,
} from './shops.schema';
import * as shopService from './shops.service';

export async function register(req: Request, res: Response) {
  const input = registerShopSchema.parse(req.body);
  res.status(201).json({ data: await shopService.register(req.user!.sub, input) });
}

export async function getInfo(req: Request, res: Response) {
  res.json({ data: await shopService.getInfo(req.user!.sub) });
}

export async function getBySlug(req: Request, res: Response) {
  const { slug } = slugParamSchema.parse(req.params);
  res.json({ data: await shopService.getBySlug(slug) });
}

export async function getSellerShop(req: Request, res: Response) {
  res.json({ data: req.shop });
}

export async function updateSellerShop(req: Request, res: Response) {
  const input = updateShopSchema.parse(req.body);
  res.json({ data: await shopService.update(req.shop!, input) });
}

// Gửi mã OTP về email để đổi tài khoản ngân hàng
export async function sendBankOtp(req: Request, res: Response) {
  res.json({ data: await shopService.sendBankOtp(req.shop!, req.user!.sub) });
}

// Đổi tài khoản ngân hàng (cần mật khẩu + OTP)
export async function updateBank(req: Request, res: Response) {
  const input = updateBankSchema.parse(req.body);
  res.json({ data: await shopService.updateBank(req.shop!, req.user!.sub, input) });
}

// Sửa hồ sơ đăng ký khi chờ duyệt / bị từ chối (bị từ chối thì tự gửi lại)
export async function updateApplication(req: Request, res: Response) {
  const input = updateApplicationSchema.parse(req.body);
  res.json({ data: await shopService.updateApplication(req.user!.sub, input) });
}
