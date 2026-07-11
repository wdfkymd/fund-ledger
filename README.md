# 基金记账 fund-ledger

## 技术栈
- Next.js (App Router) + TypeScript
- Prisma + SQLite (`better-sqlite3` adapter)
- Zod 校验
- JWT Cookie 会话（jose + bcryptjs）
- 天天基金公开接口拉取净值

## 已实现后端能力
### 鉴权
- `POST /api/auth/register` 注册
- `POST /api/auth/login` 登录
- `POST /api/auth/logout` 退出
- `GET /api/auth/me` 当前用户

### 持仓
- `GET /api/holdings` 持仓列表 + 汇总
- `POST /api/holdings` 添加持仓（自动拉基金信息）
- `GET /api/holdings/:id` 持仓详情
- `DELETE /api/holdings/:id` 删除持仓

### 交易（加仓/减仓）
- `GET /api/transactions?holdingId=`
- `POST /api/transactions` type: `BUY | SELL | SIP`

### 定投
- `GET /api/sip-plans`
- `POST /api/sip-plans`
- `PATCH /api/sip-plans` body 带 `id`
- `DELETE /api/sip-plans/:id`
- `POST /api/sip-plans/run` 执行到期定投
  - 登录用户：只跑自己的计划
  - Header `x-cron-secret: $CRON_SECRET`：可跑全部用户（给 cron 用）
  - body 可选 `{ "force": true }` 强制执行（忽略本月已执行/未到日）

### 基金净值
- `GET /api/funds?q=` 搜索
- `GET /api/funds?code=` 查单只
- `POST /api/funds` 刷新当前用户全部持仓净值

### 收益统计
- `GET /api/stats`

## 本地命令
```bash
npm install
npm run db:push
npm run dev
```

## 前端
基于 [shadcn-fintech](https://github.com/abderrahimghazali/shadcn-fintech) 模板构建，使用 shadcn/ui + Tailwind CSS v4。
- `shadcn/ui` 组件（`@base-ui/react`）
- `next-themes` 暗色模式切换
- `recharts` 图表
- `motion` 动画
- `lucide-react` 图标

## 页面
| 路由 | 功能 |
|---|---|
| `/sign-in` | 登录 |
| `/sign-up` | 注册 |
| `/dashboard` | 基金总览（持仓汇总 + 收益统计） |
| `/holdings` | 持仓管理（添加/删除） |
| `/transactions` | 交易记录（买入/卖出/删除） |
| `/sip-plans` | 定投计划（创建/执行/删除） |
| `/settings` | 设置（开发中） |

## 数据模型
User / Fund / Holding / Transaction / SipPlan / NavHistory
