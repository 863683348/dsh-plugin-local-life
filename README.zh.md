# dsh-plugin-local-life

面向 [DeepSeek Harness](https://github.com/deepseek-ai/dsh) agent 的**本地生活工具包**：预算规划、账单分摊、单价换算、折扣计算、单位换算与出行清单。日常算术，交给插件。

## 安装

```bash
dsh plugin --profile <profile> add dsh-plugin-local-life
```

重启 DSH 后，`local_life` 工具全局注册。

## 工具

| 动作 | 用途 |
| --- | --- |
| `budget` | 月度预算：收入按类别（金额或百分比）分配，含储蓄与结余 |
| `split` | 账单分摊：均分或按权重，支持小费与取整 |
| `price` | 单价换算（如每公斤 / 每 100 克多少钱） |
| `discount` | 折扣计算：百分比折扣或满减（带门槛） |
| `convert` | 单位换算 —— 重量（斤/公斤/磅）、长度（里/公里/尺/英里）、容量（升/加仑）、温度（°C/°F） |
| `checklist` | 出行清单（city / airport / outdoor / self-drive） |
| `ledger` | 记账流水汇总（分类/月度合计） |
| `loan` | 贷款分期（等额本息/等额本金、月供与总利息）

## 配置

均为可选项，写在组合行的 `config` 里：

| 键 | 默认值 | 含义 |
| --- | --- | --- |
| `personaSection` | `true` | 是否注册本地生活提示词段 |
| `sectionOrder` | `6` | 提示词段顺序（persona 为 0，升序） |

## 设计

纯逻辑（`lib/local.js`）零 DSH/Cordis 依赖、可独立单测；`lib/index.js` 是薄 Cordis 壳。无文件系统访问，全部确定性、无副作用。

## License

MIT
