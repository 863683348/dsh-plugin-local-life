/**
 * dsh-plugin-local-life — a model-facing `local_life` tool and local-life
 * prompt guidance for DeepSeek Harness agents.
 *
 * A Cordis plugin: when the package is a profile layer (declares
 * `dsh.bundle.patch`), cordis.patch.yml inserts this row into the launcher
 * composition and the host runner loads this file. All logic is pure and
 * lives in ./local.js; this module wires it up as a model tool.
 *
 * @module dsh-plugin-local-life
 */
import z from "@deepseek-ai/schemastery";
import { defineTool } from "@deepseek-ai/dsh-tools";
import {
  amortize,
  amortizeEqualPrincipal,
  budgetPlan,
  summarizeLedger,
  discount,
  splitBill,
  tripChecklist,
  unitConvert,
  unitPrice,
} from "./local.js";

/** Cordis plugin name (registered with the loader). */
const name = "local-life";

/** Services this plugin must resolve before it applies. */
const inject = ["tools", "systemPrompt"];

/** Composition-row configuration for the plugin entry. */
const Config = z.object({
  /** Register the local-life prompt-guidance section. */
  personaSection: z.boolean().default(true),
  /** Order of the section (ascending; persona is 0). */
  sectionOrder: z.number().default(6),
});

const SECTION_TEXT = [
  "Local-life guidance:",
  "- Use the `local_life` tool for everyday arithmetic: `budget` for monthly plans, `split` for bill splitting (equal or weighted, with optional tip), `price` for unit-price comparison, `discount` for percent-off / amount-off math, `convert` for units (jin/kg, li/km, C/F, L/gallon...).",
  "- For outings and trips, offer the relevant `checklist` (city / airport / outdoor / self-drive).",
  "- Always state the assumptions (tax included? tip? currency) before quoting numbers.",
  "- Track spending with `ledger` (category/month summaries) and evaluate loans with `loan` (equal-payment or equal-principal schedules).",
].join("\n");

function apply(ctx, config) {
  ctx.tools.register(defineTool({
    name: "local_life",
    description: "Local-life helper: `budget` (monthly budget plan from income and category amounts/percentages, with savings and leftover), `split` (split a bill equally or by weights, optional tip and rounding), `price` (unit-price comparison, e.g. price per kg), `discount` (percent-off or amount-off with threshold), `convert` (unit conversion: weight jin/kg/lb, length li/km/chi/mile, volume L/gallon, temperature C/F), `checklist` (trip/outing checklist by scenario: city/airport/outdoor/self-drive), `ledger` (expense ledger summary by category and month), `loan` (loan amortization: equal-payment or equal-principal schedules). Use it for everyday finance, shopping, cooking, and travel planning.",
    parameters: {
      action: {
        type: "string", required: true,
        enum: ["budget", "split", "price", "discount", "convert", "checklist", "ledger", "loan"],
        description: "Which local-life helper to run.",
      },
      income: { type: "number", description: "Monthly income (budget)." },
      items: {
        type: "array",
        items: { type: "object", properties: { name: { type: "string" }, amount: { type: "number" }, pct: { type: "number" } } },
        description: "Budget categories [{name, amount|pct}] (budget).",
      },
      savingsPct: { type: "number", description: "Savings percent of income (budget)." },
      total: { type: "number", description: "Bill total (split)." },
      people: { type: "integer", description: "Number of people (split)." },
      weights: { type: "array", items: { type: "number" }, description: "Per-person weights (split)." },
      tipPct: { type: "number", description: "Tip percent (split)." },
      roundTo: { type: "number", description: "Round each share up to this multiple (split)." },
      price: { type: "number", description: "Price paid (price/discount)." },
      amount: { type: "number", description: "Amount bought (price)." },
      amountUnit: { type: "string", description: "Amount unit, e.g. g/kg/斤 (price)." },
      compareUnit: { type: "string", description: "Comparison unit, e.g. kg/100g (price)." },
      offPct: { type: "number", description: "Percent off 0-100 (discount)." },
      offAmount: { type: "number", description: "Fixed amount off (discount)." },
      threshold: { type: "number", description: "Minimum spend for amount-off (discount)." },
      value: { type: "number", description: "Value to convert (convert)." },
      from: { type: "string", description: "Source unit (convert)." },
      to: { type: "string", description: "Target unit (convert)." },
      scenario: { type: "string", description: "city | airport | outdoor | self-drive (checklist)." },
      entries: { type: "array", items: { type: "object" }, description: "Ledger entries [{date, category, amount, note}] (ledger)." },
      amortization: { type: "string", enum: ["equal-payment", "equal-principal"], description: "Amortization method (loan)." },
    },
    output: {
      schema: {
        type: "object",
        additionalProperties: false,
        required: true,
        properties: {
          action: { type: "string", required: true },
          text: { type: "string" },
          value: { type: "number" },
          values: { type: "object" },
        },
      },
      render: (_args, value) => [{ type: "text", text: value.text ?? "" }],
    },
    execute: async (args) => {
      const action = args.action;
      let text = "";
      let value;
      let values;
      switch (action) {
        case "budget":
          values = budgetPlan({ income: args.income, items: args.items, savingsPct: args.savingsPct });
          text = values.text + (values.balanced ? "" : "\n\nOver budget — reduce categories or increase income.");
          break;
        case "split":
          values = splitBill({ total: args.total, people: args.people, weights: args.weights, tipPct: args.tipPct, roundTo: args.roundTo });
          text = values.text;
          break;
        case "price":
          values = unitPrice({ price: args.price, amount: args.amount, amountUnit: args.amountUnit, compareUnit: args.compareUnit });
          text = values.text;
          break;
        case "discount":
          values = discount({ price: args.price, offPct: args.offPct, offAmount: args.offAmount, threshold: args.threshold });
          text = values.text;
          break;
        case "convert":
          values = unitConvert({ value: args.value, from: args.from, to: args.to });
          value = values.value;
          text = values.text;
          break;
        case "checklist":
          text = tripChecklist({ scenario: args.scenario });
          break;
        case "ledger":
          text = summarizeLedger({ entries: args.entries }).text;
          break;
        case "loan":
          if (args.amortization === "equal-principal") {
            text = amortizeEqualPrincipal({ principal: args.principal, annualRate: args.annualRate, years: args.years }).text;
          } else {
            text = amortize({ principal: args.principal, annualRate: args.annualRate, years: args.years }).text;
          }
          break;
        default:
          throw new Error("local_life: unknown action '" + action + "'");
      }
      return { action, text, value, values };
    },
    presentCall: (args) => ({
      card: "generic",
      title: "Local life: " + args.action,
      kind: "other",
      rawInput: args,
    }),
  }));

  if (config.personaSection) {
    ctx.effect(() => ctx.systemPrompt.section({
      name: "local-life:instructions",
      order: config.sectionOrder,
      text: SECTION_TEXT,
    }), "local-life.section()");
  }
}

export { Config, SECTION_TEXT, apply, inject, name };
