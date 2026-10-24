import { describe, expect, it } from "vitest";
import {
  addMonth,
  budgetSummary,
  datesInMonth,
  emptyProfile,
  entryAllocation,
  allocationPart,
  expectedReceipt,
  forecast,
  goalMonthly,
  ruleDates,
  ruleTotal,
  sourceAllocation,
  walletBalance,
  yearSummary,
} from "../src/math";
import { migrateLegacy, validateBackup } from "../src/db";
import type { Backup, Entry, IncomeSource, Rule, Snapshot } from "../src/types";
const ticket: Rule = {
  id: "ticket",
  name: "Transport",
  category: "Transport",
  amount: 500,
  units: 2,
  frequency: "days",
  weekdays: [1, 2, 3, 4, 5],
  start: "2026-01-01",
  end: "",
  excluded: [],
};
const source = (over: Partial<IncomeSource> = {}): IncomeSource => ({
  ...ticket,
  id: "salary",
  name: "Salary",
  kind: "Salary",
  frequency: "monthly",
  amount: 40000,
  coversMonths: 1,
  ...over,
});
const entry = (over: Partial<Entry> = {}): Entry => ({
  id: "entry",
  type: "expense",
  amount: 500,
  date: "2026-10-01",
  category: "Transport",
  note: "Ticket",
  walletId: "cash",
  ruleId: "ticket",
  ...over,
});
const state = (over: Partial<Snapshot> = {}): Snapshot => ({
  profile: {
    ...emptyProfile("Test"),
    planningMode: "expected",
    sources: [source()],
  },
  wallets: [{ id: "cash", name: "Cash", opening: 0 }],
  rules: [ticket],
  entries: [],
  goals: [],
  ...over,
});
describe("editable separate prices", () => {
  const split: Rule = {
    ...ticket,
    parts: [
      { id: "out", name: "Outbound", amount: 500, units: 1 },
      { id: "back", name: "Return", amount: 800, units: 1 },
    ],
  };
  it("adds different outbound and return fares on actual calendar days", () => {
    expect(ruleTotal(split, "2026-10")).toBe(28600);
    expect(
      ruleTotal(
        {
          ...split,
          parts: split.parts!.map((p) =>
            p.id === "back" ? { ...p, amount: 1000 } : p,
          ),
        },
        "2026-10",
      ),
    ).toBe(33000);
  });
  it("does not let an outbound overrun use up the unrecorded return fare", () => {
    const out = entry({ amount: 700, partId: "out" });
    expect(forecast([split], [out], "2026-10")).toBe(28800);
    expect(
      forecast(
        [split],
        [out, entry({ id: "back", amount: 800, partId: "back" })],
        "2026-10",
      ),
    ).toBe(28800);
  });
  it("supports full-day receipts and mixtures without counting twice", () => {
    expect(forecast([split], [entry({ amount: 1300 })], "2026-10")).toBe(28600);
    expect(
      forecast(
        [split],
        [
          entry({ amount: 500, partId: "out" }),
          entry({ id: "return", amount: 800 }),
        ],
        "2026-10",
      ),
    ).toBe(28600);
  });
  it("supports editable quantities and a free direction", () => {
    expect(
      ruleTotal(
        {
          ...split,
          parts: [
            { id: "out", name: "Walk out", amount: 0, units: 1 },
            { id: "back", name: "Back", amount: 800, units: 1 },
          ],
        },
        "2026-10",
      ),
    ).toBe(17600);
    expect(
      ruleTotal(
        { ...split, parts: split.parts!.map((p) => ({ ...p, units: 2 })) },
        "2026-10",
      ),
    ).toBe(57200);
  });
  it("retains component receipts when the plan returns to a single amount", () => {
    expect(
      forecast(
        [{ ...ticket, amount: 1300, units: 1 }],
        [
          entry({ amount: 500, partId: "out" }),
          entry({ id: "back", amount: 800, partId: "back" }),
        ],
        "2026-10",
      ),
    ).toBe(28600);
  });
  it("backs up separate amounts and links, and rejects invalid parts", () => {
    const b: Backup = {
      ...state({ rules: [split], entries: [entry({ partId: "out" })] }),
      version: 2,
      exportedAt: "",
    };
    expect(validateBackup(b).rules[0].parts).toHaveLength(2);
    expect(() =>
      validateBackup({
        ...b,
        rules: [
          {
            ...split,
            parts: [{ id: "bad", name: "Bad", amount: -1, units: 1 }],
          },
        ],
      }),
    ).toThrow();
  });
  it("recalculates an unexpected receipt after editing or removing it", () => {
    const data = state({
      entries: [entry({ type: "income", ruleId: undefined, amount: 5000 })],
    });
    expect(budgetSummary(data, "2026-10").available).toBe(45000);
    data.entries[0].amount = 8000;
    expect(budgetSummary(data, "2026-10").available).toBe(48000);
    data.entries = [];
    expect(budgetSummary(data, "2026-10").available).toBe(40000);
  });
});
describe("exact calendar recurrences", () => {
  it("calculates the original student example on actual weekdays", () => {
    const meal = {
      ...ticket,
      id: "meal",
      category: "Food & groceries",
      amount: 700,
      units: 1,
    };
    expect(ruleDates(ticket, "2026-10")).toHaveLength(22);
    expect(ruleTotal(ticket, "2026-10") + ruleTotal(meal, "2026-10")).toBe(
      37400,
    );
  });
  it("honors boundaries, holidays, leap years and rollover", () => {
    expect(
      ruleDates(
        {
          ...ticket,
          start: "2026-10-05",
          end: "2026-10-16",
          excluded: ["2026-10-12"],
        },
        "2026-10",
      ),
    ).toHaveLength(9);
    expect(datesInMonth("2028-02")).toHaveLength(29);
    expect(addMonth("2026-12", 1)).toBe("2027-01");
  });
  it("counts five weekly payments in a five-payday month", () => {
    expect(
      expectedReceipt(
        source({ frequency: "weekly", start: "2026-10-01", amount: 10000 }),
        "2026-10",
      ),
    ).toBe(50000);
  });
  it("handles fortnightly and custom intervals exactly", () => {
    expect(
      expectedReceipt(
        source({
          frequency: "fortnightly",
          start: "2026-10-01",
          amount: 10000,
        }),
        "2026-10",
      ),
    ).toBe(30000);
    expect(
      ruleDates(
        {
          ...ticket,
          frequency: "custom",
          start: "2026-10-01",
          interval: 10,
          intervalUnit: "days",
        },
        "2026-10",
      ),
    ).toHaveLength(4);
  });
  it("clamps monthly anchors and restores them after shorter months", () => {
    const s = source({ start: "2027-01-31" });
    expect(ruleDates(s, "2027-02")).toEqual(["2027-02-28"]);
    expect(ruleDates(s, "2027-03")).toEqual(["2027-03-31"]);
  });
  it("handles quarterly, yearly, daily and one-time schedules", () => {
    expect(
      ruleDates(
        source({ frequency: "quarterly", start: "2026-01-15" }),
        "2026-04",
      ),
    ).toEqual(["2026-04-15"]);
    expect(
      ruleDates(
        source({ frequency: "yearly", start: "2024-02-29" }),
        "2027-02",
      ),
    ).toEqual(["2027-02-28"]);
    expect(
      ruleDates(source({ frequency: "daily", start: "2026-10-01" }), "2026-10"),
    ).toHaveLength(31);
    expect(
      ruleDates(source({ frequency: "once", start: "2026-10-01" }), "2026-11"),
    ).toHaveLength(0);
  });
  it("does not invent expected dates or amounts for irregular sources", () => {
    expect(
      sourceAllocation(
        source({ frequency: "irregular", amount: 0 }),
        "2026-10",
      ),
    ).toBe(0);
  });
});
describe("inclusive income planning", () => {
  it("distributes whole francs exactly across months without creating rounding money", () => {
    expect([0, 1, 2].map((i) => allocationPart(80000, 3, i))).toEqual([
      26667, 26667, 26666,
    ]);
    const e = entry({
      type: "income",
      ruleId: undefined,
      amount: 80000,
      coversMonths: 3,
      budgetMonth: "2026-10",
    });
    expect(
      ["2026-10", "2026-11", "2026-12"].reduce(
        (sum, m) => sum + entryAllocation(e, m),
        0,
      ),
    ).toBe(80000);
  });
  it("spreads an 80k two-month payment without inventing a second receipt", () => {
    const s = source({
      amount: 80000,
      frequency: "bimonthly",
      coversMonths: 2,
    });
    expect(expectedReceipt(s, "2026-01")).toBe(80000);
    expect(expectedReceipt(s, "2026-02")).toBe(0);
    expect(sourceAllocation(s, "2026-01")).toBe(40000);
    expect(sourceAllocation(s, "2026-02")).toBe(40000);
  });
  it("combines sources and adds extra receipts to the expected plan", () => {
    const data = state();
    data.profile!.sources.push(
      source({ id: "projects", frequency: "irregular", amount: 0 }),
    );
    data.entries = [
      entry({
        type: "income",
        ruleId: undefined,
        sourceId: "projects",
        amount: 15000,
      }),
    ];
    expect(budgetSummary(data, "2026-10").available).toBe(55000);
  });
  it("linked salary receipts replace expectations rather than doubling them", () => {
    const data = state({
      entries: [
        entry({
          type: "income",
          ruleId: undefined,
          sourceId: "salary",
          amount: 40000,
        }),
      ],
    });
    expect(budgetSummary(data, "2026-10").available).toBe(40000);
    data.entries[0].amount = 45000;
    expect(budgetSummary(data, "2026-10").available).toBe(45000);
  });
  it("received mode uses actual allocations and ignores forecasts", () => {
    const data = state();
    data.profile!.planningMode = "received";
    expect(budgetSummary(data, "2026-10").available).toBe(0);
    data.entries = [
      entry({
        type: "income",
        ruleId: undefined,
        amount: 80000,
        coversMonths: 2,
        budgetMonth: "2026-10",
      }),
    ];
    expect(budgetSummary(data, "2026-10").available).toBe(40000);
    expect(budgetSummary(data, "2026-11").available).toBe(40000);
    expect(walletBalance(data.wallets[0], data.entries, "2026-10-24")).toBe(
      80000,
    );
  });
  it("supports assigning a received payment to a chosen month", () => {
    const e = entry({
      type: "income",
      ruleId: undefined,
      amount: 30000,
      budgetMonth: "2026-11",
    });
    expect(entryAllocation(e, "2026-10")).toBe(0);
    expect(entryAllocation(e, "2026-11")).toBe(30000);
  });
  it("includes opening funds only when explicitly allocated", () => {
    const data = state({
      wallets: [{ id: "cash", name: "Cash", opening: 20000 }],
    });
    expect(budgetSummary(data, "2026-10").available).toBe(40000);
    data.profile!.openingAllocations["2026-10"] = 10000;
    expect(budgetSummary(data, "2026-10").available).toBe(50000);
    expect(budgetSummary(data, "2026-10").balance).toBe(20000);
  });
  it("keeps transfers neutral and linked ticket expenses single counted", () => {
    const transfer = entry({
      id: "move",
      type: "transfer",
      ruleId: undefined,
      amount: 10000,
      toWalletId: "momo",
    });
    const entries = [entry(), entry({ id: "return" }), transfer];
    expect(forecast([ticket], entries, "2026-10")).toBe(22000);
    expect(
      walletBalance(
        { id: "cash", name: "Cash", opening: 40000 },
        entries,
        "2026-10-24",
      ),
    ).toBe(29000);
    expect(
      walletBalance(
        { id: "momo", name: "MoMo", opening: 0 },
        entries,
        "2026-10-24",
      ),
    ).toBe(10000);
  });
  it("adds overruns and unplanned purchases to the forecast", () => {
    expect(
      forecast(
        [ticket],
        [
          entry({ amount: 1200 }),
          entry({ id: "extra", ruleId: undefined, amount: 100 }),
        ],
        "2026-10",
      ),
    ).toBe(22300);
  });
  it("projects all twelve months using the selected funding mode", () => {
    const rows = yearSummary(state(), 2026);
    expect(rows).toHaveLength(12);
    expect(rows.reduce((s, r) => s + r.available, 0)).toBe(480000);
    expect(rows.reduce((s, r) => s + r.planned, 0)).toBe(261000);
  });
  it("calculates remaining goal contributions including overdue targets", () => {
    expect(
      goalMonthly(
        {
          id: "g",
          name: "Goal",
          target: 90000,
          saved: 30000,
          deadline: "2026-12-31",
        },
        "2026-10-24",
      ),
    ).toBe(20000);
    expect(
      goalMonthly(
        {
          id: "g",
          name: "Goal",
          target: 90000,
          saved: 30000,
          deadline: "2026-01-01",
        },
        "2026-10-24",
      ),
    ).toBe(60000);
  });
});
describe("backups and compatibility", () => {
  const backup: Backup = { ...state(), version: 2, exportedAt: "" };
  it("round trips custom categories, wallets and multiple income sources", () => {
    const b = structuredClone(backup);
    b.profile!.categories.push("Farming");
    b.wallets.push({ id: "group", name: "My savings group", opening: 1000 });
    expect(validateBackup(b)).toBe(b);
  });
  it("rejects invalid money, duplicate IDs, impossible dates and orphaned references", () => {
    for (const entries of [
      [entry({ amount: -1 })],
      [entry(), entry()],
      [entry({ date: "2026-02-31" })],
      [entry({ walletId: "missing" })],
      [entry({ type: "income", sourceId: "missing", ruleId: undefined })],
    ])
      expect(() => validateBackup({ ...backup, entries })).toThrow();
  });
  it("rejects opening balance double allocation", () => {
    const b = structuredClone(backup);
    b.profile!.openingAllocations = { "2026-10": 10000 };
    expect(() => validateBackup(b)).toThrow();
  });
  it("migrates version 1 records without inventing income source associations", () => {
    const legacy = {
      version: 1,
      profile: {
        id: "main",
        name: "Old user",
        income: {
          name: "Bursary",
          amount: 80000,
          months: 2,
          startMonth: "2026-10",
        },
        created: "2026-10-01",
        savingsTarget: 0,
      },
      wallets: [{ id: "cash", name: "Cash", opening: 0 }],
      rules: [{ ...ticket, category: "Meals" }],
      entries: [
        entry({
          type: "income",
          ruleId: undefined,
          category: "Meals",
          amount: 15000,
        }),
      ],
      goals: [],
    };
    const b = validateBackup(legacy);
    expect(b.version).toBe(2);
    expect(b.profile!.sources[0].coversMonths).toBe(2);
    expect(b.entries[0].amount).toBe(15000);
    expect(b.entries[0].sourceId).toBeUndefined();
    expect(b.entries[0].needsSourceReview).toBe(true);
    expect(b.rules[0].category).toBe("Food & groceries");
    expect(
      (legacy.profile as unknown as { income: unknown }).income,
    ).toBeDefined();
    expect(migrateLegacy(legacy).version).toBe(2);
  });
});
