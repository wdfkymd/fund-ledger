# fund-ledger Agent 宪法

任何时候使用中文，除非用户明确要求英文输出。

## 项目阶段

本仓库是**半路接管**、已有代码的个人基金记账项目。不能当空项目重来；先读 `dev-docs/` 与源码再改。

## 项目是什么

个人自用的基金记账 Web（Next.js 全栈）。用户注册登录后管理持仓、记录买入/卖出/定投，并查看盈亏与净值。

## 边界

- **做**：持仓、自选（仅关注行情）、交易（BUY/SELL/SIP）、净值拉取、单基金详情、收益分析、汇总统计、账号设置（昵称/改密/退出）
- **不做**：券商下单、自动交易、多用户协作/家庭账本、投顾建议
- **定投**：仅交易类型 `SIP`，不是独立定时计划
- **自选**：`WatchlistItem` 独立于持仓，不计入资产/成本；可与持仓重叠

## 真源

1. 当前源码、Prisma schema、运行中的 API/页面行为
2. 本文件 + `CLAUDE.md`
3. 内部 `dev-docs/`（默认不公开推送）
4. 公开 `README.md`（不得与代码长期冲突）

## Owner

| 领域 | Owner |
|------|--------|
| 金额/份额算法 | `src/lib/finance.ts` |
| 鉴权 | `src/lib/auth.ts` |
| 基金外部数据 | `src/lib/fund-api.ts` |
| 校验 | `src/lib/validators.ts` |
| API | `src/app/api/**` |
| Schema | `prisma/schema.prisma` |

禁止在页面组件里另写一套成本算法或鉴权结论。

## 危险接管动作

以下须先获用户确认：改写本宪法、移动/删除 `dev-docs`、删除数据模型/API、换鉴权或数据库、公开推送内部真源。

## 工程纪律

- 架构优先、窄修窄验；不把半成品当空项目重写
- 禁止补丁式双路径、假成功、mock 冒充实净值
- 改 schema 后 `npm run db:push`；上线前 `npm run build` 并 `systemctl --user restart fund-ledger`
- 禁止 `git add .`；禁止提交 `.env`、`*.db`、密钥
- 公开远程为 GitHub public：内部 `dev-docs/` 与密钥不得推送

## 安全红线

- 前端输入不可信；身份、数据归属、金额与份额写入必须由服务端重新验证（Zod + requireUser + finance）
- 用户输入不得直接进入 SQL/命令/HTML；接口限制允许写入字段
- 密钥不得写入源码、日志、截图或 Git 历史
- 跨用户访问、篡改 holdingId、越权改他人交易必须被拒绝
- 安全审计不等于修复授权；只要求检查时先报告证据，未经确认不得扩大修改
- 未提供本轮安全验证证据，不得声称安全或可以上线；缺失标记 `未验证`

## 验证

```bash
npm run build
systemctl --user status fund-ledger
curl -sS -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8000/sign-in
```

改持仓/交易后：用登录 Cookie 测 GET/POST/PATCH/DELETE，并核对持仓份额与成本。

## 停止条件

- 要换栈、换库、改 Cookie/鉴权方案、删除用户数据模型：先说明影响并等用户确认
- 连续三次修复失败：停止补丁，回到 owner/真源诊断
