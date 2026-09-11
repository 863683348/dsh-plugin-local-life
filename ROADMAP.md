# dsh-plugin-local-life 路线图（Roadmap）

> 基线：**v0.1.0**（已发布 npm / 已挂 vertical-toolkits profile）
> 范围：接下来 5 个版本 **v0.2.0 → v0.6.0**
> 规划原则：日常算术"算对、算清"；纯逻辑模块可单测、无副作用；账本类能力走 `ctx.fs` + containment 校验。

## 版本总览

| 版本 | 主题 | 关键交付 |
|---|---|---|
| v0.2.0 | 记账与贷款 | `ledger` 记账流水汇总 + `loan` 贷款/分期计算 |
| v0.3.0 | 比价与食谱 | `compare` 购物比价与优惠券 + `recipe_cost` 食谱成本核算 |
| v0.4.0 | 日历与共享 | `calendar` 缴费日历 + `shared` 家庭共享账本 |
| v0.5.0 | 出行与保障 | `commute` 通勤成本对比 + `insurance` 保险方案对比 |
| v0.6.0 | 报告与简报 | `annual_report` 年度收支报告 + `daily_brief` 每日生活简报 |

## v0.2.0（下一个版本）— 记账与贷款

### 新增动作
- `ledger`：记账流水汇总——
  - 输入流水（日期/分类/金额）→ 分类汇总、月度合计、结余计算
  - 可输出 Markdown 汇总表；支持从工作区 CSV/JSON 文件读流水（`ctx.fs`）
- `loan`：贷款分期计算——
  - 等额本息 / 等额本金：月供、总利息、还款计划表
  - 支持提前还款与不同利率方案对比

### 实现位置
- `lib/local.js`：新增 `summarizeLedger` / `amortize` / `amortizeEqualPrincipal` 纯函数
- `lib/index.js`：注册 2 个新 action 到 `local_life` 工具

### 验收标准
- [ ] `node --check` 通过
- [ ] 新增单测 ≥ 8 个（分类汇总、等额本息公式、等额本金公式、总利息、边界：0 期/0 利率）
- [ ] 原有 6 个 action 单测全绿
- [ ] README（en/zh）更新
- [ ] vertical-toolkits dump-config 正常

## v0.3.0 ✅ 已完成 — 比价与食谱

- `compare`：多商品单价对比（规格归一）、满减/折扣叠加计算
- `recipe_cost`：食材清单 × 用量/单价 → 每份成本、采购合计

## v0.4.0 — 日历与共享

- `calendar`：账单/缴费到期日历（项目、金额、日期、提醒清单）
- `shared`：多人流水合并汇总（去重、人均、结算建议）

## v0.5.0 — 出行与保障

- `commute`：通勤方式成本对比（时间/月成本/年成本）
- `insurance`：保险方案对比（保费/保额/杠杆/覆盖项）

## v0.6.0 — 报告与简报

- `annual_report`：年度收支报告（分类占比、月度趋势、储蓄率）
- `daily_brief`：每日简报（预算余量、待缴账单、今日行程清单）

## 发布节奏

每个版本完成后走完整 dsh-factory 流程：本地验证 → npm publish → GitHub topic → awesome PR。
