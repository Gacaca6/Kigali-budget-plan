import Dexie, { type Table } from "dexie";
import {
  categories,
  frequencies,
  type Backup,
  type Entry,
  type Goal,
  type Profile,
  type Rule,
  type Snapshot,
  type Wallet,
} from "./types";

// Pure conversion is shared by the IndexedDB upgrade and old JSON backups.
export function migrateLegacy(
  value: Record<string, unknown>,
): Record<string, unknown> {
  const copy = structuredClone(value);
  const p = copy.profile as Record<string, unknown> | undefined;
  if (p && !Array.isArray(p.sources)) {
    const old = p.income as
      | { name: string; amount: number; months: number; startMonth: string }
      | undefined;
    p.sources = old
      ? [
          {
            id: "legacy-income",
            name: old.name,
            kind: "Other",
            amount: old.amount,
            coversMonths: old.months,
            frequency: old.months === 2 ? "bimonthly" : "monthly",
            start: `${old.startMonth}-01`,
            end: "",
            weekdays: [],
            excluded: [],
          },
        ]
      : [];
    p.categories = [...categories];
    p.planningMode = "expected";
    p.budgetStart = old?.startMonth || String(p.created).slice(0, 7);
    p.openingAllocations = {};
    delete p.income;
    for (const key of ["rules", "entries"])
      for (const row of (copy[key] as { category: string }[]) || [])
        if (row.category === "Meals") row.category = "Food & groceries";
    // Old receipts have no source metadata. Preserve their amounts and dates,
    // and ask the user to classify them rather than guessing a relationship.
    for (const row of (copy.entries as Entry[]) || [])
      if (row.type === "income" && old) {
        row.needsSourceReview = true;
      }
  }
  copy.version = 2;
  return copy;
}
export class BudgetDB extends Dexie {
  profiles!: Table<Profile>;
  rules!: Table<Rule>;
  entries!: Table<Entry>;
  wallets!: Table<Wallet>;
  goals!: Table<Goal>;
  constructor(name = "korabudget-offline") {
    super(name);
    const schema = {
      profiles: "id",
      rules: "id,category",
      entries: "id,date,walletId",
      wallets: "id",
      goals: "id",
    };
    this.version(1).stores(schema);
    this.version(2)
      .stores(schema)
      .upgrade(async (tx) => {
        const profile = await tx.table("profiles").get("main");
        if (!profile) return;
        const converted = migrateLegacy({
          profile,
          rules: await tx.table("rules").toArray(),
          entries: await tx.table("entries").toArray(),
        });
        await tx.table("profiles").put(converted.profile);
        await tx.table("rules").bulkPut(converted.rules as Rule[]);
        await tx.table("entries").bulkPut(converted.entries as Entry[]);
      });
  }
}
export const db = new BudgetDB();
export async function snapshot(): Promise<Snapshot> {
  return db.transaction("r", db.tables, async () => ({
    profile: await db.profiles.get("main"),
    rules: (await db.rules.toArray()).sort((a, b) =>
      a.name.localeCompare(b.name),
    ),
    entries: await db.entries.toArray(),
    wallets: (await db.wallets.toArray()).sort(
      (a, b) =>
        (a.order ?? ["cash", "momo", "airtel", "bank"].indexOf(a.id)) -
        (b.order ?? ["cash", "momo", "airtel", "bank"].indexOf(b.id)),
    ),
    goals: (await db.goals.toArray()).sort((a, b) =>
      a.deadline.localeCompare(b.deadline),
    ),
  }));
}
const obj = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): v is string =>
  typeof v === "string" && v.length <= 500;
const name = (v: unknown): v is string => str(v) && v.trim().length > 0;
const amount = (v: unknown): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= 0 && v <= 1e12;
export function isDate(v: unknown): v is string {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(v) &&
    !Number.isNaN(Date.parse(v)) &&
    new Date(`${v}T12:00:00Z`).toISOString().slice(0, 10) === v
  );
}
export const isMonth = (v: unknown): v is string =>
  typeof v === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
function validSchedule(s: unknown) {
  if (!obj(s)) return false;
  return (
    frequencies.some((f) => f.value === s.frequency) &&
    isDate(s.start) &&
    (s.end === "" || (isDate(s.end) && s.end >= s.start)) &&
    Array.isArray(s.weekdays) &&
    s.weekdays.every((d) => Number.isInteger(d) && d >= 0 && d <= 6) &&
    Array.isArray(s.excluded) &&
    s.excluded.every(isDate) &&
    (s.frequency !== "days" || s.weekdays.length > 0) &&
    (s.frequency !== "custom" ||
      (typeof s.interval === "number" &&
        Number.isInteger(s.interval) &&
        s.interval >= 1 &&
        s.interval <= 366 &&
        ["days", "weeks", "months"].includes(String(s.intervalUnit))))
  );
}
export function validateBackup(input: unknown): Backup {
  if (
    !obj(input) ||
    ![1, 2].includes(input.version as number) ||
    !obj(input.profile)
  )
    throw new Error("Choose a KoraBudget backup (version 1 or 2).");
  let value = input;
  if (input.version === 1) {
    const old = input.profile.income;
    if (
      !obj(old) ||
      !amount(old.amount) ||
      ![1, 2].includes(old.months as number) ||
      !isMonth(old.startMonth) ||
      !name(old.name)
    )
      throw new Error("The legacy income plan is invalid.");
    value = migrateLegacy(input);
  }
  const p = value.profile;
  if (
    !obj(p) ||
    p.id !== "main" ||
    !name(p.name) ||
    !isDate(p.created) ||
    !amount(p.savingsTarget) ||
    !["received", "expected"].includes(String(p.planningMode)) ||
    (p.budgetStart !== undefined && !isMonth(p.budgetStart)) ||
    !Array.isArray(p.categories) ||
    !p.categories.length ||
    p.categories.length > 100 ||
    p.categories.some((c) => !name(c)) ||
    new Set(p.categories).size !== p.categories.length ||
    !Array.isArray(p.sources) ||
    p.sources.length > 100 ||
    !obj(p.openingAllocations) ||
    Object.entries(p.openingAllocations).some(
      ([m, a]) => !isMonth(m) || !amount(a),
    )
  )
    throw new Error("The profile in this backup is invalid.");
  for (const key of ["rules", "entries", "wallets", "goals", "sources"]) {
    const rows = key === "sources" ? p.sources : value[key];
    if (
      !Array.isArray(rows) ||
      rows.length > 100000 ||
      rows.some((v) => !obj(v) || !name(v.id)) ||
      new Set(rows.map((v) => v.id)).size !== rows.length
    )
      throw new Error("The backup contains invalid or duplicate records.");
  }
  const b = value as unknown as Backup;
  const profile = b.profile!;
  if (
    profile.sources.some(
      (s) =>
        !name(s.name) ||
        !name(s.kind) ||
        !amount(s.amount) ||
        !Number.isInteger(s.coversMonths) ||
        s.coversMonths < 1 ||
        s.coversMonths > 24 ||
        !validSchedule(s),
    )
  )
    throw new Error("Income source data is invalid.");
  if (
    !b.wallets.length ||
    b.wallets.some(
      (w) =>
        !name(w.name) ||
        !amount(w.opening) ||
        (w.order !== undefined && (!Number.isInteger(w.order) || w.order < 0)),
    )
  )
    throw new Error("Wallet data is invalid.");
  if (
    Object.values(profile.openingAllocations).reduce((s, a) => s + a, 0) >
    b.wallets.reduce((s, w) => s + w.opening, 0)
  )
    throw new Error("Existing balance has been allocated more than once.");
  if (
    b.rules.some(
      (r) =>
        !name(r.name) ||
        !profile.categories.includes(r.category) ||
        !amount(r.amount) ||
        !amount(r.units) ||
        r.units < 1 ||
        r.units > 100 ||
        r.frequency === "irregular" ||
        !validSchedule(r),
    )
  )
    throw new Error("Planned expense data is invalid.");
  const wallets = new Set(b.wallets.map((w) => w.id)),
    rules = new Set(b.rules.map((r) => r.id)),
    sources = new Set(profile.sources.map((s) => s.id));
  if (
    b.entries.some(
      (e) =>
        !["expense", "income", "transfer"].includes(e.type) ||
        !amount(e.amount) ||
        !e.amount ||
        !isDate(e.date) ||
        !str(e.note) ||
        !wallets.has(e.walletId) ||
        !profile.categories.includes(e.category) ||
        (e.createdAt !== undefined &&
          (!Number.isSafeInteger(e.createdAt) || e.createdAt < 0)) ||
        (e.ruleId !== undefined && !rules.has(e.ruleId)) ||
        (e.sourceId !== undefined && !sources.has(e.sourceId)) ||
        (e.needsSourceReview !== undefined &&
          typeof e.needsSourceReview !== "boolean") ||
        (e.budgetMonth !== undefined && !isMonth(e.budgetMonth)) ||
        (e.coversMonths !== undefined &&
          (!Number.isInteger(e.coversMonths) ||
            e.coversMonths < 1 ||
            e.coversMonths > 24)) ||
        (e.type === "transfer" &&
          (!e.toWalletId ||
            !wallets.has(e.toWalletId) ||
            e.walletId === e.toWalletId)),
    )
  )
    throw new Error("Transaction data is invalid.");
  if (
    b.goals.some(
      (g) =>
        !name(g.name) ||
        !amount(g.target) ||
        !g.target ||
        !amount(g.saved) ||
        !isDate(g.deadline),
    )
  )
    throw new Error("Savings goal data is invalid.");
  return b;
}
export async function restore(b: Backup) {
  await db.transaction("rw", db.tables, async () => {
    for (const table of db.tables) await table.clear();
    await db.profiles.put(b.profile!);
    await db.rules.bulkPut(b.rules);
    await db.entries.bulkPut(b.entries);
    await db.wallets.bulkPut(b.wallets);
    await db.goals.bulkPut(b.goals);
  });
}
export async function renameCategory(old: string, next: string) {
  await db.transaction("rw", db.profiles, db.rules, db.entries, async () => {
    const p = (await db.profiles.get("main"))!;
    if (
      p.categories.some(
        (c) => c !== old && c.toLowerCase() === next.toLowerCase(),
      )
    )
      throw new Error("A category with that name already exists.");
    p.categories = p.categories.map((c) => (c === old ? next : c));
    await db.profiles.put(p);
    await db.rules.where("category").equals(old).modify({ category: next });
    await db.entries
      .filter((e) => e.category === old)
      .modify({ category: next });
  });
}
