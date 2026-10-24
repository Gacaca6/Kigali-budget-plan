import "fake-indexeddb/auto";
import Dexie from "dexie";
import { expect, it } from "vitest";
import { BudgetDB } from "../src/db";
it("upgrades an existing v1 IndexedDB database without losing records", async () => {
  const name = `migration-${Date.now()}`;
  const old = new Dexie(name);
  old.version(1).stores({
    profiles: "id",
    rules: "id,category",
    entries: "id,date,walletId",
    wallets: "id",
    goals: "id",
  });
  await old.table("profiles").put({
    id: "main",
    name: "Existing user",
    created: "2026-10-01",
    income: {
      name: "Bursary",
      amount: 80000,
      months: 2,
      startMonth: "2026-10",
    },
    savingsTarget: 0,
  });
  await old.table("wallets").put({ id: "cash", name: "Cash", opening: 80000 });
  await old.table("rules").put({
    id: "meal",
    name: "Food",
    category: "Meals",
    amount: 700,
    units: 1,
    frequency: "days",
    start: "2026-10-01",
    end: "",
    excluded: [],
    weekdays: [1, 2, 3, 4, 5],
  });
  await old.table("entries").put({
    id: "expense",
    type: "expense",
    category: "Meals",
    amount: 700,
    date: "2026-10-01",
    note: "Lunch",
    walletId: "cash",
    ruleId: "meal",
  });
  old.close();
  const updated = new BudgetDB(name);
  await updated.open();
  const p = await updated.profiles.get("main");
  expect(p!.sources[0].amount).toBe(80000);
  expect(p!.planningMode).toBe("expected");
  expect(await updated.entries.count()).toBe(1);
  expect((await updated.entries.get("expense"))!.amount).toBe(700);
  expect((await updated.entries.get("expense"))!.category).toBe(
    "Food & groceries",
  );
  expect((await updated.wallets.get("cash"))!.opening).toBe(80000);
  await updated.delete();
});
