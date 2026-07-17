import { z } from "zod";

export const registerSchema = z.object({
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位"),
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
    newPassword: z.string().min(8, "新密码至少 8 位"),
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
  costPrice: z.number().min(0, "成本价不能为负数").optional(),
  costAmount: z.number().min(0, "成本不能为负数").optional(),
  note: z.string().trim().max(200).optional(),
});

export const holdingUpdateSchema = z.object({
  note: z.string().trim().max(200).nullable().optional(),
});

function tradeDateSchema() {
  return z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "交易日期格式应为 YYYY-MM-DD")
    .refine((v) => {
      const d = new Date(v);
      return Number.isFinite(d.getTime());
    }, "交易日期无效");
}

const amountStrict = z
  .number()
  .positive("金额必须大于 0")
  .max(1e8, "金额过大");

const sharesStrict = z
  .number()
  .positive("份额必须大于 0")
  .max(1e10, "份额过大");

const navStrict = z
  .number()
  .positive("净值必须大于 0")
  .max(1e8, "净值过大");

export const transactionCreateSchema = z.object({
  holdingId: z.string().min(1),
  type: z.enum(["BUY", "SELL", "SIP"]),
  amount: amountStrict,
  shares: sharesStrict,
  nav: navStrict,
  fee: z.number().min(0).max(1e8).default(0),
  tradeDate: tradeDateSchema(),
  note: z.string().trim().max(200).optional(),
});

export const transactionUpdateSchema = z.object({
  type: z.enum(["BUY", "SELL", "SIP"]).optional(),
  amount: amountStrict.optional(),
  shares: sharesStrict.optional(),
  nav: navStrict.optional(),
  fee: z.number().min(0).max(1e8).optional(),
  tradeDate: tradeDateSchema().optional(),
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
