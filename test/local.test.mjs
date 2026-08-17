import { test } from "node:test";
import assert from "node:assert/strict";
import {
  budgetPlan,
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
