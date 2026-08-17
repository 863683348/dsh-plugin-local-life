/**
 * dsh-plugin-local-life — pure local-life helpers: budgets, bill splitting,
 * unit prices, discounts, unit conversions, trip checklists.
 *
 * No DSH or Cordis imports here, so this module is unit-testable in
 * isolation. The model talks to the user; these helpers do the arithmetic.
 */

function round2(v) {
  return Math.round((v + Number.EPSILON) * 100) / 100;
}

/** Monthly budget plan: allocate income across categories. */
export function budgetPlan({ income = 0, items = [], savingsPct = 0 } = {}) {
  const inc = Number(income);
  if (!Number.isFinite(inc) || inc < 0) throw new Error("local: income must be a non-negative number");
  const list = Array.isArray(items) ? items.filter((x) => x && x.name) : [];
  const allocated = [];
  let used = 0;
  for (const it of list) {
    let amount;
    if (typeof it.amount === "number" && Number.isFinite(it.amount)) {
      amount = it.amount;
    } else if (typeof it.pct === "number" && Number.isFinite(it.pct)) {
      amount = (inc * it.pct) / 100;
    } else {
      throw new Error("local: each budget item needs amount or pct");
    }
    if (amount < 0) throw new Error("local: budget item amounts must be non-negative");
    allocated.push({ name: it.name, amount: round2(amount) });
    used += amount;
  }
  const savings = (inc * Number(savingsPct || 0)) / 100;
  const leftover = inc - used - savings;
  return {
    income: inc,
    savings: round2(savings),
    items: allocated,
    allocatedTotal: round2(used),
    leftover: round2(leftover),
    balanced: leftover >= 0,
    text: [
      "Income: " + inc,
      "Savings target: " + round2(savings),
      ...allocated.map((a) => "- " + a.name + ": " + a.amount),
      "Allocated total: " + round2(used),
      "Leftover: " + round2(leftover) + (leftover >= 0 ? "" : " (over budget!)"),
    ].join("\n"),
  };
}

/** Split a bill N ways with optional weights and tip. */
export function splitBill({ total = 0, people = 2, weights = [], tipPct = 0, roundTo } = {}) {
  const t = Number(total);
  const n = Math.max(1, Math.floor(people));
  const tip = Number(tipPct || 0);
  if (!Number.isFinite(t) || t < 0) throw new Error("local: total must be a non-negative number");
  if (tip < 0) throw new Error("local: tipPct must be non-negative");
  const grand = t * (1 + tip / 100);
  let shares;
  if (Array.isArray(weights) && weights.length === n && weights.every((w) => Number(w) > 0)) {
    const sum = weights.reduce((a, w) => a + Number(w), 0);
    shares = weights.map((w) => (grand * Number(w)) / sum);
  } else {
    shares = Array.from({ length: n }, () => grand / n);
  }
  const rounded = shares.map((s) => (roundTo == null ? round2(s) : Math.ceil((s - 1e-9) / roundTo) * roundTo));
  const sum = rounded.reduce((a, b) => a + b, 0);
  const adjustment = roundTo == null ? round2(sum - grand) : round2(grand - sum);
  if (roundTo == null && Math.abs(adjustment) > 0.01) {
    rounded[n - 1] = round2(rounded[n - 1] - adjustment);
  }
  return {
    total: t,
    tipPct: tip,
    grandTotal: round2(grand),
    people: n,
    shares: rounded,
    sharesSum: round2(rounded.reduce((a, b) => a + b, 0)),
    text: [
      "Bill: " + t + (tip > 0 ? " + " + tip + "% tip" : "") + " = " + round2(grand),
      ...rounded.map((s, i) => "- Person " + (i + 1) + ": " + s),
      "Sum: " + round2(rounded.reduce((a, b) => a + b, 0)),
    ].join("\n"),
  };
}

const UNIT_FACTORS = {
  weight: { g: 1, kg: 1000, 克: 1, 公斤: 1000, 千克: 1000, 斤: 500, 磅: 453.59237, oz: 28.349523 },
  volume: { ml: 1, L: 1000, 升: 1000, 毫升: 1, 加仑: 3785.411784, gallon: 3785.411784, cup: 236.588 },
  length: { m: 1, km: 1000, cm: 0.01, 米: 1, 公里: 1000, 千米: 1000, 里: 500, 尺: 0.333333, 英里: 1609.344, mile: 1609.344, ft: 0.3048 },
};

/** Unit price: normalize an amount to price-per-comparison-unit. */
export function unitPrice({ price = 0, amount = 0, amountUnit = "g", compareUnit = "kg" } = {}) {
  const p = Number(price);
  const a = Number(amount);
  if (!Number.isFinite(p) || !Number.isFinite(a) || a <= 0) throw new Error("local: price and positive amount required");
  let factor = null;
  for (const table of Object.values(UNIT_FACTORS)) {
    if (amountUnit in table && compareUnit in table) {
      factor = table[compareUnit] / table[amountUnit];
      break;
    }
  }
  if (factor === null) throw new Error("local: unsupported units '" + amountUnit + "' -> '" + compareUnit + "'");
  const per = (p / a) * factor;
  return { unitPrice: round2(per), perUnit: compareUnit, text: p + " / " + a + amountUnit + " = " + round2(per) + " per " + compareUnit };
}

/** Discount math: percent-off, amount-off with threshold, savings. */
export function discount({ price = 0, offPct, offAmount, threshold } = {}) {
  const p = Number(price);
  if (!Number.isFinite(p) || p < 0) throw new Error("local: price must be a non-negative number");
  let final = p;
  let note = "";
  if (offAmount != null && Number.isFinite(Number(offAmount))) {
    if (threshold != null && p < Number(threshold)) note = " (threshold " + threshold + " not met — no discount)";
    else final = p - Number(offAmount);
  } else if (offPct != null && Number.isFinite(Number(offPct))) {
    if (offPct < 0 || offPct > 100) throw new Error("local: offPct must be between 0 and 100");
    final = p * (1 - Number(offPct) / 100);
    note = " (" + offPct + "% off)";
  }
  final = Math.max(0, round2(final));
  return { original: p, final, savings: round2(p - final), note: note.trim(), text: p + " -> " + final + note };
}

const TEMP = {
  toBase: { c: (v) => v, f: (v) => (v - 32) * 5 / 9 },
  fromBase: { c: (v) => v, f: (v) => v * 9 / 5 + 32 },
};

/** Convert between supported units (weight/length/volume/temperature). */
export function unitConvert({ value = 0, from = "kg", to = "斤" } = {}) {
  const v = Number(value);
  if (!Number.isFinite(v)) throw new Error("local: value must be a finite number");
  const f = String(from).toLowerCase();
  const t = String(to).toLowerCase();
  if (f === t) return { value: v, from, to, text: v + " " + from };
  for (const table of Object.values(UNIT_FACTORS)) {
    if (f in table && t in table) {
      const out = (v * table[f]) / table[t];
      return { value: round2(out), from, to, text: v + " " + from + " = " + round2(out) + " " + to };
    }
  }
  const tc = f.replace(/°?celsius?|摄氏/g, "c").replace(/°?fahrenheit?|华氏/g, "f");
  const tt = t.replace(/°?celsius?|摄氏/g, "c").replace(/°?fahrenheit?|华氏/g, "f");
  if (tc in TEMP.toBase && tt in TEMP.fromBase) {
    const out = TEMP.fromBase[tt](TEMP.toBase[tc](v));
    return { value: round2(out), from, to, text: v + " " + from + " = " + round2(out) + " " + to };
  }
  throw new Error("local: unsupported conversion '" + from + "' -> '" + to + "'");
}

const TRIP_LISTS = {
  city: ["ID / passport", "Phone charger + power bank", "Transport app / metro card", "Hotel confirmation", "Comfortable shoes", "Umbrella or rain gear", "Local SIM / eSIM or roaming plan"],
  airport: ["Passport / ID", "Boarding pass (or check-in code)", "Visa / entry documents", "Liquids under 100ml in clear bag", "Power bank in carry-on", "Chargers + adapter", "Arrival transport plan"],
  outdoor: ["Weather check + layered clothing", "Water (2L+) and snacks", "Navigation (offline map / GPS)", "First-aid kit", "Sun protection (hat, sunscreen)", "Flashlight / headlamp", "Tell someone your route"],
  selfdrive: ["License + registration + insurance", "Full tank / charge plan", "Tire pressure check", "Navigation + offline map", "Emergency kit (jack, triangle)", "Cash / toll card", "Rest stops planned"],
};

/** Trip/outing checklist by scenario. */
export function tripChecklist({ scenario = "city" } = {}) {
  const list = TRIP_LISTS[scenario] ?? TRIP_LISTS.city;
  return "Trip checklist (" + scenario + "):\n- [ ] " + list.join("\n- [ ] ");
}
