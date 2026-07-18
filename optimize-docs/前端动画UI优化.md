# fund-ledger 前端 UI / 动画优化

审阅 `~/fund-ledger` 前端交互体验。项目已引入 `motion`（framer-motion v12）、`recharts`、`AnimatedNumber`、`tw-animate-css`，基础动画骨架已有，但交互细节不足。

---

## 观察点

### 1. 页面路由过渡动画
当前侧边栏导航是 Next.js 硬切换，无过渡。

- 在 `(dashboard)/layout.tsx` 的 `<main>` 外层包 `<motion.div>`：
  - 初始：`opacity: 0, y: 8`
  - 进入：`opacity: 1, y: 0`，duration 0.2s
- 利用 `usePathname()` + `AnimatePresence` 做路由过渡
- 不要用 `next-view-transitions`，保持轻量

### 2. Dashboard 数字滚动动画
`AnimatedNumber` 组件已写好（`motion.animate` + cubic bezier）但 dashboard 未使用：

- 总资产 `{fmt(assets)}` → `<AnimatedNumber value={assets} formatFn={fmt} />`
- 总成本、累计盈亏、收益率同理
- duration 0.5s，ease `[0.19, 1, 0.22, 1]`（与现有组件一致）

### 3. 持仓/自选列表入场动画
- 当前列表是静态 `<ul>`，无入场动画
- 加 `AnimatePresence mode="popLayout"` + `motion.li`（用已有 `staggerItem(i)` variants）
- Tab 切换（持仓 ↔ 自选）交叉 fade + 微位移，不生硬闪现
- 刷新后内容更新也做旧项 fadeOut → 新项 fadeIn

### 4. 卡片微交互
- 持仓/自选/交易卡片：hover `scale: 1.01` + 阴影加深（`whileHover`）
- 总资产区域的汇总卡片（成本/盈亏/收益率）：hover 微动
- Tab 切换按钮（持仓/自选）：`whileTap={{ scale: 0.96 }}`
- 带 `Link` 的列表项：hover 时文字颜色渐变动画（已有 `transition-colors`，确认生效）

### 5. 刷新按钮反馈增强
当前刷新只有图标 spin，数据更新无感知。

- 刷新中：总资产区域加半透明 overlay + opacity 渐变（`0→0.5→0`）
- 刷新完成：列表项重新 stagger 入场
- 刷新失败：toast 或错误提示（检查是否有 toast 组件）

### 6. 空状态动画
暂无持仓/自选/交易时显示 border-dashed 卡片：

- 加 `motion.div` 从 `opacity:0 y:20`  渐入
- "去添加"链接 hover 时右侧箭头平滑右移动画

### 7. Skeleton → 内容过渡
- 加载中显示 Skeleton，加载后直接替换，有闪烁感
- 用 `AnimatePresence` 在 `loading` 状态切换时 cross-fade（opacity 0.2s）
- Skeleton 本身加 pulse 动画（tailwind `animate-pulse` 已自带）

### 8. Recharts 图表增强
`src/components/charts/` 有两个图表组件：

- ✅ 检查 CustomTooltip 是否跟随 dark/light 主题
- ✅ 数据点少时（<30）显示圆点 + hover 高亮线
- ✅ 数值格式化统一用 dashboard 的 `fmt()` / `fmtPct()`
- ✅ 图表容器设置 `min-height` 防止加载时坍缩

### 9. 侧边栏 active 指示器动画
- 当前 active tab 如果是静态高亮，加 `motion.div layoutId="active-indicator"` 实现平滑滑动
- 侧边栏展开/收起动画确认 shadcn 自带已有 ✅

### 10. 主题切换过渡
- dark ↔ light 切换时：
  - `html` / `body` 加 `transition: background-color 0.3s, color 0.3s`
  - 图表颜色、数字颜色跟随过渡
- `tw-animate-css` 已安装，确认是否全局生效

### 11. `loading.tsx` 增强
`src/app/(dashboard)/dashboard/loading.tsx` 确认内容：

- 使用 Skeleton 组件，布局结构与真实页面一致，减少 Layout Shift
- Skeleton 本身带 pulse 动画

### 12. 数字格式统一
`fmt()` / `fmtPct()` / `fmtNav()` / `signedMoney()` 分布在多个组件：

- ✅ 如果 `src/lib/utils.ts` 已有这些函数，统一引用，不用组件各自重写
- ✅ 如果只有 dashboard-client.tsx 中有，抽到 `src/lib/format.ts`

---

## 执行规则

- 幅度/份额算法 owner 是 `src/lib/finance.ts`——UI 组件不重写算法
- 不改 schema、auth、API 逻辑
- 每项独立 commit，message 写清改动
- 改完 `npm run build` 无报错
- 用 `npm run dev` 手动测试交互效果
