import { test } from "node:test";
import assert from "node:assert/strict";
import {
  amortize,
  compareUnitPrices,
  recipeCost,
  stackDiscounts,
  amortizeEqualPrincipal,
  budgetPlan,
  summarizeLedger,
  discount,
  splitBill,
  tripChecklist,
  unitConvert,
  unitPrice,
} from "../lib/local.js";

test("budgetPlan allocates, saves, and reports leftover", () => {
  const p = budgetPlan({
    income: 10000,
    items: [{ name: "rent", amount: 4000 }, { name: "food", pct: 20 }],
    savingsPct: 10,
  });
  assert.equal(p.savings, 1000);
  assert.equal(p.allocatedTotal, 6000);
  assert.equal(p.leftover, 3000);
  assert.equal(p.balanced, true);
});

test("budgetPlan flags over budget", () => {
  const p = budgetPlan({ income: 5000, items: [{ name: "rent", amount: 6000 }] });
  assert.equal(p.balanced, false);
  assert.equal(p.leftover, -1000);
});

test("splitBill equal split with tip", () => {
  const s = splitBill({ total: 300, people: 3, tipPct: 10 });
  assert.equal(s.grandTotal, 330);
  assert.deepEqual(s.shares, [110, 110, 110]);
});

test("splitBill weighted split", () => {
  const s = splitBill({ total: 300, people: 2, weights: [1, 2] });
  assert.deepEqual(s.shares, [100, 200]);
});

test("unitPrice normalizes to per-kg", () => {
  const u = unitPrice({ price: 10, amount: 500, amountUnit: "g", compareUnit: "kg" });
  assert.equal(u.unitPrice, 20);
});

test("unitPrice jin to per-kg", () => {
  const u = unitPrice({ price: 12, amount: 1, amountUnit: "斤", compareUnit: "kg" });
  assert.equal(u.unitPrice, 24);
});

test("discount percent and amount-off", () => {
  assert.equal(discount({ price: 100, offPct: 25 }).final, 75);
  assert.equal(discount({ price: 100, offAmount: 30, threshold: 99 }).final, 70);
  assert.equal(discount({ price: 50, offAmount: 30, threshold: 99 }).final, 50);
});

test("unitConvert weight and temperature", () => {
  assert.equal(unitConvert({ value: 1, from: "kg", to: "斤" }).value, 2);
  assert.equal(unitConvert({ value: 100, from: "c", to: "f" }).value, 212);
  assert.equal(unitConvert({ value: 212, from: "f", to: "c" }).value, 100);
});

test("unitConvert throws on incompatible units", () => {
  assert.throws(() => unitConvert({ value: 1, from: "kg", to: "mile" }), /unsupported/);
});

test("tripChecklist returns scenario items", () => {
  const out = tripChecklist({ scenario: "airport" });
  assert.ok(out.includes("Boarding pass"));
  assert.ok(out.includes("- [ ]"));
});


test("summarizeLedger totals by category and month", () => {
  const s = summarizeLedger({
    entries: [
      { date: "2026-08-01", category: "food", amount: 50 },
      { date: "2026-08-02", category: "food", amount: 30 },
      { date: "2026-08-03", category: "transport", amount: 20 },
      { date: "2026-09-01", category: "food", amount: 100 },
    ],
  });
  assert.equal(s.total, 200);
  assert.equal(s.count, 4);
  assert.equal(s.byCategory.food, 180);
  assert.equal(s.byCategory.transport, 20);
  assert.equal(s.byMonth["2026-08"], 100);
  assert.equal(s.byMonth["2026-09"], 100);
  assert.ok(s.text.includes("# Ledger summary"));
});

test("summarizeLedger rejects non-numeric amounts", () => {
  assert.throws(() => summarizeLedger({ entries: [{ date: "x", category: "a", amount: "abc" }] }));
});

test("amortize equal-payment schedule math", () => {
  const loan = amortize({ principal: 120000, annualRate: 6, years: 10 });
  assert.equal(loan.schedule.length, 120);
  assert.ok(loan.monthly > 1000 && loan.monthly < 1500, "monthly around 1332");
  assert.ok(loan.totalInterest > 30000 && loan.totalInterest < 45000);
  assert.ok(Math.abs(loan.schedule[119].balance) < 1, "final balance ~0");
  const sumPrincipal = loan.schedule.reduce((s, x) => s + x.principal, 0);
  assert.ok(Math.abs(sumPrincipal - 120000) < 5, "principal sums to ~120000");
});

test("amortize zero-rate loan", () => {
  const loan = amortize({ principal: 12000, annualRate: 0, years: 1 });
  assert.equal(loan.monthly, 1000);
  assert.equal(loan.totalInterest, 0);
});

test("amortizeEqualPrincipal decreasing payments", () => {
  const loan = amortizeEqualPrincipal({ principal: 12000, annualRate: 12, years: 1 });
  assert.equal(loan.schedule.length, 12);
  assert.equal(loan.monthlyPrincipal, 1000);
  assert.ok(loan.schedule[0].payment > loan.schedule[11].payment, "payment decreases");
  assert.ok(loan.totalInterest > 0);
});

test("loan functions reject bad input", () => {
  assert.throws(() => amortize({ principal: 0, annualRate: 5, years: 1 }));
  assert.throws(() => amortize({ principal: 1000, annualRate: 5, years: 0 }));
  assert.throws(() => amortizeEqualPrincipal({ principal: -5, annualRate: 5, years: 1 }));
});


test("compareUnitPrices normalizes specs and finds the best deal", () => {
  const res = compareUnitPrices({
    items: [
      { name: "A", price: 12, quantity: 1, unit: "kg" },
      { name: "B", price: 20, quantity: 2, unit: "kg" },
      { name: "C", price: 8, quantity: 0.5, unit: "kg" },
    ],
    normalize: 1000,
  });
  assert.equal(res.best, "B", "20/2 = 10 per kg is cheapest");
  assert.equal(res.worst, "C", "8/0.5 = 16 per kg is dearest");
  assert.equal(res.rows[1].perNormalized, 10000);
  assert.ok(res.savings > 0);
  assert.ok(res.text.includes("# Unit price comparison"));
});

test("compareUnitPrices validates items", () => {
  assert.throws(() => compareUnitPrices({ items: [] }));
  assert.throws(() => compareUnitPrices({ items: [{ name: "x", price: 1, quantity: 0 }] }));
  assert.throws(() => compareUnitPrices({ items: [{ name: "x", price: -1, quantity: 1 }] }));
});

test("stackDiscounts applies percentage then amount", () => {
  const res = stackDiscounts({ price: 100, discounts: [{ pct: 10 }, { amount: 20 }] });
  assert.equal(res.final, 70);
  assert.equal(res.totalSaved, 30);
  assert.equal(res.effectivePct, 30);
  assert.equal(res.steps.length, 2);
  assert.equal(res.steps[0].after, 90);
});

test("stackDiscounts honours thresholds and clamps at zero", () => {
  const skipped = stackDiscounts({ price: 80, discounts: [{ threshold: 100, pct: 50 }] });
  assert.equal(skipped.final, 80);
  assert.equal(skipped.steps[0].applied, false);
  assert.ok(skipped.steps[0].reason.includes("below threshold"));
  const clamped = stackDiscounts({ price: 50, discounts: [{ amount: 80 }] });
  assert.equal(clamped.final, 0);
  assert.equal(clamped.totalSaved, 50);
});

test("stackDiscounts validates input", () => {
  assert.throws(() => stackDiscounts({ price: 10, discounts: [] }));
  assert.throws(() => stackDiscounts({ price: -1, discounts: [{ pct: 10 }] }));
  assert.throws(() => stackDiscounts({ price: 10, discounts: [{ pct: 150 }] }));
});

test("recipeCost totals ingredients and divides by servings", () => {
  const res = recipeCost({
    name: "番茄炒蛋",
    servings: 2,
    ingredients: [
      { name: "番茄", quantity: 3, unit: "个", unitPrice: 2 },
      { name: "鸡蛋", quantity: 4, unit: "个", unitPrice: 1.5 },
      { name: "油", quantity: 0.05, unit: "L", unitPrice: 20 },
    ],
  });
  assert.equal(res.total, 13);
  assert.equal(res.perServing, 6.5);
  assert.equal(res.rows.length, 3);
  assert.ok(res.text.includes("per serving: 6.5"));
});

test("recipeCost validates input", () => {
  assert.throws(() => recipeCost({ ingredients: [] }));
  assert.throws(() => recipeCost({ servings: 0, ingredients: [{ name: "x", quantity: 1, unitPrice: 1 }] }));
  assert.throws(() => recipeCost({ ingredients: [{ name: "x", quantity: -1, unitPrice: 1 }] }));
});
