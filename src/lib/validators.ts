import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(6, "密码至少 6 位"),
  name: z.string().trim().min(1).max(50).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(1, "请输入密码"),
});

export const holdingCreateSchema = z.object({
  fundCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "基金代码应为 6 位数字"),
  fundName: z.string().trim().optional(),
  shares: z.number().min(0, "份额不能为负数").optional(),
  /** 成本价（单位净值成本），总成本 = shares * costPrice */
  costPrice: z.number().min(0, "成本价不能为负数").optional(),
  /** 总成本（投入金额）；若同时传 costPrice 则以 costPrice 为准 */
  costAmount: z.number().min(0, "成本不能为负数").optional(),
  note: z.string().trim().max(200).optional(),
});

export const transactionCreateSchema = z.object({
  holdingId: z.string().min(1),
  type: z.enum(["BUY", "SELL", "SIP"]),
  amount: z.number().positive("金额必须大于 0"),
  shares: z.number().positive("份额必须大于 0"),
  nav: z.number().positive("净值必须大于 0"),
  fee: z.number().min(0).default(0),
  tradeDate: z.string().min(1, "请选择交易日期"),
  note: z.string().trim().max(200).optional(),
});


