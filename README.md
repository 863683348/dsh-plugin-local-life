# dsh-plugin-local-life

A **local-life toolkit** for [DeepSeek Harness](https://github.com/deepseek-ai/dsh) agents: budgets, bill splitting, unit prices, discounts, unit conversions, and trip checklists. Everyday arithmetic, done right.

## Compatibility

Tool schemas are validated against the `@deepseek-ai/dsh-tools` value-schema DSL at plugin load (checked against dsh-tools 0.1.0-rc.6 and 0.1.1-rc.2). Earlier releases used JSON-Schema `required` at the root of `output.schema` and closed nested objects without declared properties, which made the host abort the whole profile boot with `unsupported JSON schema: schema.required is not supported by the value schema DSL` and could reject the tool's own results. Current releases fix both; if an affected version left your DSH unable to start, remove the plugin from the profile (or upgrade) — no data is lost.

## Install

```bash
dsh plugin --profile <profile> add dsh-plugin-local-life
```

Restart DSH. The `local_life` tool is registered host-wide.

## Tool

| action | purpose |
| --- | --- |
| `budget` | Monthly budget plan from income and category amounts/percentages, with savings and leftover |
| `split` | Split a bill equally or by weights, optional tip and rounding |
| `price` | Unit-price comparison (e.g. price per kg / per 100g) |
| `discount` | Percent-off or amount-off (with threshold) math |
| `convert` | Unit conversion — weight (斤/kg/磅), length (里/km/尺/英里), volume (L/加仑), temperature (°C/°F) |
| `checklist` | Trip/outing checklist by scenario (city / airport / outdoor / self-drive) |
| `ledger` | Expense-ledger summary — totals by category and month |
| `loan` | Loan amortization — equal-payment or equal-principal schedules, monthly payment and total interest |
| `compare` | Spec-normalized unit-price comparison and stacked discounts/thresholds |
| `recipe_cost` | Recipe cost from ingredients — total and per-serving |

## Config

All optional, on the composition row's `config`:

| key | default | meaning |
| --- | --- | --- |
| `personaSection` | `true` | register the local-life prompt-guidance section |
| `sectionOrder` | `6` | prompt section order (persona is 0, ascending) |

## Design

Pure logic (`lib/local.js`) has zero DSH/Cordis imports and is unit-tested in isolation; `lib/index.js` is the thin Cordis plugin wiring the tool and the prompt section. No filesystem access — deterministic and side-effect free.

## License

MIT


## Roadmap

See [ROADMAP.md](./ROADMAP.md) — next five versions (v0.2.0 – v0.6.0): ledger & loans, shopping compare & recipe cost, bills calendar & shared ledger, commute & insurance compare, annual report & daily briefing.
