import { test } from "node:test";
import assert from "node:assert/strict";
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
