# 基金记账 fund-ledger

个人自用的基金持仓与交易记账。

## 技术栈

- Next.js (App Router) + TypeScript
- Prisma + SQLite (`better-sqlite3` adapter)
- Zod 校验
- JWT Cookie 会话（jose + bcryptjs）
- 天天基金公开接口拉取净值

## 产品边界

- **做**：注册登录、持仓、自选、交易（买入/卖出/定投）、净值刷新、收益汇总
- **不做**：券商交易、自动下单、多用户协作
- **定投**：交易类型 `SIP`，不是独立定时计划
- **自选**：关注行情，不计入资产；可与持仓重叠

## API

### 鉴权

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me` 当前用户
- `PATCH /api/auth/me` 更新昵称 `{ name }`
- `POST /api/auth/password` 修改密码 `{ currentPassword, newPassword, confirmPassword }`

### 持仓

- `GET /api/holdings` 列表 + 汇总
- `POST /api/holdings` 添加（自动拉基金信息）
- `GET /api/holdings/:id` 详情
- `PATCH /api/holdings/:id` 编辑份额/成本/备注
- `DELETE /api/holdings/:id` 删除

### 交易

- `GET /api/transactions?holdingId=`
- `POST /api/transactions` type: `BUY | SELL | SIP`
- `PATCH /api/transactions/:id` 编辑（先冲销旧记录再应用新值）
- `DELETE /api/transactions/:id` 删除并回滚持仓

### 自选

- `GET /api/watchlist` 列表（含是否已持有）
- `POST /api/watchlist` 添加 `{ fundCode, fundName?, note? }`
- `DELETE /api/watchlist/:id` 移除（不影响持仓）

### 基金净值 / 估值

- `GET /api/funds?q=` 搜索
- `GET /api/funds?code=` 查单只（含 `nav` 单位净值 + `estimateNav` 实时估值）
- `POST /api/funds` 刷新当前用户持仓 + 自选基金：写入单位净值与盘中估值（`gsz`/`gszzl`/`gztime`）

### 统计 / 收益分析

- `GET /api/stats` 持仓汇总（兼容）
- `GET /api/analytics` 收益页数据：汇总、资金流水、占比、盈亏排行、近 12 月流水

## 本地命令

```bash
cp .env.example .env   # 填写 AUTH_SECRET
npm install
npm run db:push
npm run dev            # 开发
npm run build && npm start
```

生产示例（本机）：

```bash
systemctl --user restart fund-ledger   # 默认 :8000
```

## 页面

| 路由 | 功能 |
|------|------|
| `/sign-in` `/sign-up` | 登录 / 注册 |
| `/dashboard` | 总览 |
| `/holdings` | 持仓（添加/编辑/删除） |
| `/watchlist` | 自选（添加/移除/刷新估值） |
| `/transactions` | 交易（记一笔/编辑/删除） |
| `/analytics` | 收益分析（流水 / 占比 / 排行） |
| `/settings` | 设置（昵称 / 改密 / 主题 / 退出） |

## 数据模型

User / Fund / Holding / WatchlistItem / Transaction / NavHistory

## 内部真源

开发决策与接管记录见 `dev-docs/`（默认不纳入公开交付）。
