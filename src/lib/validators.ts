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

export const profileUpdateSchema = z.object({
  name: z.string().trim().min(1, "昵称不能为空").max(50, "昵称最多 50 字"),
});

export const passwordChangeSchema = z
  .object({
    currentPassword: z.string().min(1, "请输入当前密码"),
    newPassword: z.string().min(6, "新密码至少 6 位"),
    confirmPassword: z.string().min(1, "请确认新密码"),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "两次输入的新密码不一致",
    path: ["confirmPassword"],
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "新密码不能与当前密码相同",
    path: ["newPassword"],
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

export const holdingUpdateSchema = z
  .object({
    shares: z.number().min(0, "份额不能为负数").optional(),
    /** 成本价；若提供则 costAmount = shares * costPrice（shares 取本次更新后值） */
    costPrice: z.number().min(0, "成本价不能为负数").optional(),
    costAmount: z.number().min(0, "成本不能为负数").optional(),
    note: z.string().trim().max(200).nullable().optional(),
  })
  .refine(
    (v) =>
      v.shares !== undefined ||
      v.costPrice !== undefined ||
      v.costAmount !== undefined ||
      v.note !== undefined,
    { message: "请至少提供一个要修改的字段" },
  );

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

export const transactionUpdateSchema = z.object({
  type: z.enum(["BUY", "SELL", "SIP"]).optional(),
  amount: z.number().positive("金额必须大于 0").optional(),
  shares: z.number().positive("份额必须大于 0").optional(),
  nav: z.number().positive("净值必须大于 0").optional(),
  fee: z.number().min(0).optional(),
  tradeDate: z.string().min(1, "请选择交易日期").optional(),
  note: z.string().trim().max(200).nullable().optional(),
});

export const watchlistCreateSchema = z.object({
  fundCode: z
    .string()
    .trim()
    .regex(/^\d{6}$/, "基金代码应为 6 位数字"),
  fundName: z.string().trim().optional(),
  note: z.string().trim().max(200).optional(),
});


