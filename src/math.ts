import type {
  Entry,
  Goal,
  IncomeSource,
  Profile,
  Rule,
  Schedule,
  Snapshot,
  Wallet,
} from "./types";
export const money = (n: number) =>
  new Intl.NumberFormat("en-RW", { maximumFractionDigits: 0 }).format(n);
export function today() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
export function monthIndex(month: string) {
  const [y, m] = month.split("-").map(Number);
  return y * 12 + m - 1;
}
export function addMonth(month: string, count: number) {
  const d = new Date(
    Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5)) - 1 + count, 1),
  );
  return d.toISOString().slice(0, 7);
}
export function monthLabel(month: string, short = false) {
  return new Date(`${month}-02T12:00:00`).toLocaleDateString("en-GB", {
    month: short ? "short" : "long",
    year: "numeric",
  });
}
export function datesInMonth(month: string) {
  const [y, m] = month.split("-").map(Number);
  return Array.from(
    { length: new Date(Date.UTC(y, m, 0)).getUTCDate() },
    (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`,
  );
}
// UTC calendar dates avoid daylight-saving drift. Monthly recurrences keep their
// anchor day, clamping to the last day of short months (Jan 31 → Feb 28 → Mar 31).
export function appliesOn(s: Schedule, date: string) {
  if (date < s.start || (s.end && date > s.end) || s.excluded.includes(date))
    return false;
  const elapsed = Math.round(
    (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${s.start}T00:00:00Z`)) /
      86400000,
  );
  if (s.frequency === "irregular") return false;
  if (s.frequency === "once") return date === s.start;
  if (s.frequency === "daily") return true;
  if (s.frequency === "days")
    return s.weekdays.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
  if (s.frequency === "weekly") return elapsed % 7 === 0;
  if (s.frequency === "fortnightly") return elapsed % 14 === 0;
  if (s.frequency === "custom" && s.intervalUnit !== "months")
    return (
      elapsed % ((s.interval || 1) * (s.intervalUnit === "weeks" ? 7 : 1)) === 0
    );
  const every =
    s.frequency === "bimonthly"
      ? 2
      : s.frequency === "quarterly"
        ? 3
        : s.frequency === "yearly"
          ? 12
          : s.frequency === "custom"
            ? s.interval || 1
            : 1;
  const gap = monthIndex(date.slice(0, 7)) - monthIndex(s.start.slice(0, 7));
  const day = Math.min(
    Number(s.start.slice(8)),
    datesInMonth(date.slice(0, 7)).length,
  );
  return gap % every === 0 && Number(date.slice(8)) === day;
}
export function ruleDates(s: Schedule, month: string) {
  return datesInMonth(month).filter((date) => appliesOn(s, date));
}
export function ruleTotal(rule: Rule, month: string) {
  return ruleDates(rule, month).length * occurrenceCost(rule);
}
export function occurrenceCost(rule: Rule) {
  return rule.parts?.length
    ? rule.parts.reduce((sum, part) => sum + part.amount * part.units, 0)
    : rule.amount * rule.units;
}
export function expectedReceipt(source: IncomeSource, month: string) {
  return ruleDates(source, month).length * source.amount;
}
export function sourceAllocation(source: IncomeSource, month: string) {
  let total = 0;
  for (let offset = 0; offset < source.coversMonths; offset++)
    total +=
      ruleDates(source, addMonth(month, -offset)).length *
      allocationPart(source.amount, source.coversMonths, offset);
  return total;
}
export function allocationPart(amount: number, parts: number, offset: number) {
  return Math.floor(amount / parts) + (offset < amount % parts ? 1 : 0);
}
export function entryAllocation(e: Entry, month: string) {
  if (e.type !== "income") return 0;
  const gap =
    monthIndex(month) - monthIndex(e.budgetMonth || e.date.slice(0, 7));
  return gap >= 0 && gap < (e.coversMonths || 1)
    ? allocationPart(e.amount, e.coversMonths || 1, gap)
    : 0;
}
export function walletBalance(
  wallet: Wallet,
  entries: Entry[],
  asOf = today(),
) {
  return entries
    .filter((e) => e.date <= asOf)
    .reduce(
      (v, e) =>
        v +
        (e.type === "income" && e.walletId === wallet.id ? e.amount : 0) -
        (e.type === "expense" && e.walletId === wallet.id ? e.amount : 0) +
        (e.type === "transfer" && e.toWalletId === wallet.id ? e.amount : 0) -
        (e.type === "transfer" && e.walletId === wallet.id ? e.amount : 0),
      wallet.opening,
    );
}
export function spending(entries: Entry[], month: string, category?: string) {
  return entries
    .filter(
      (e) =>
        e.type === "expense" &&
        e.date.startsWith(month) &&
        (!category || e.category === category),
    )
    .reduce((s, e) => s + e.amount, 0);
}
export function forecast(rules: Rule[], entries: Entry[], month: string) {
  let total = 0;
  const linked = new Map<string, number>();
  for (const e of entries) {
    if (e.type !== "expense" || !e.date.startsWith(month)) continue;
    total += e.amount;
    if (e.ruleId) {
      const aggregate = `${e.ruleId}/${e.date}`;
      linked.set(aggregate, (linked.get(aggregate) || 0) + e.amount);
      const key = `${e.ruleId}/${e.date}/${e.partId || ""}`;
      linked.set(key, (linked.get(key) || 0) + e.amount);
    }
  }
  for (const r of rules)
    for (const date of ruleDates(r, month)) {
      const key = `${r.id}/${date}/`;
      if (r.parts?.length) {
        const unspent = r.parts.reduce(
          (sum, part) =>
            sum +
            Math.max(
              0,
              part.amount * part.units - (linked.get(key + part.id) || 0),
            ),
          0,
        );
        total += Math.max(0, unspent - (linked.get(key) || 0));
      } else
        total += Math.max(
          0,
          occurrenceCost(r) - (linked.get(`${r.id}/${date}`) || 0),
        );
    }
  return total;
}
export function budgetSummary(data: Snapshot, month: string) {
  const p = data.profile!;
  const actual = new Map<string, number>();
  for (const e of data.entries) {
    if (e.date > today()) continue;
    const amount = entryAllocation(e, month);
    if (amount)
      actual.set(
        e.sourceId || "extra",
        (actual.get(e.sourceId || "extra") || 0) + amount,
      );
  }
  let expected = 0,
    effective = 0;
  for (const source of p.sources) {
    const projection = sourceAllocation(source, month);
    const received = actual.get(source.id) || 0;
    expected += projection;
    effective += Math.max(projection, received);
    actual.delete(source.id);
  }
  const extras = [...actual.values()].reduce((s, v) => s + v, 0);
  effective += extras;
  const received = data.entries
    .filter((e) => e.date <= today())
    .reduce((s, e) => s + entryAllocation(e, month), 0);
  const opening = p.openingAllocations[month] || 0;
  const available =
    opening + (p.planningMode === "received" ? received : effective);
  const projected = forecast(data.rules, data.entries, month),
    spent = spending(data.entries, month),
    planned = data.rules.reduce((s, r) => s + ruleTotal(r, month), 0);
  const balance = data.wallets.reduce(
    (s, w) => s + walletBalance(w, data.entries),
    0,
  );
  const reserve =
    month >= (p.budgetStart || p.created.slice(0, 7)) ? p.savingsTarget : 0;
  return {
    expected,
    received,
    opening,
    available,
    projected,
    spent,
    planned,
    balance,
    reserve,
    remaining: available - projected - reserve,
    unfunded: Math.max(0, available - opening - received),
  };
}
export function yearSummary(data: Snapshot, year: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const month = `${year}-${String(i + 1).padStart(2, "0")}`;
    return { month, ...budgetSummary(data, month) };
  });
}
export function goalMonthly(g: Goal, from = today()) {
  return Math.ceil(
    Math.max(0, g.target - g.saved) /
      Math.max(
        1,
        monthIndex(g.deadline.slice(0, 7)) - monthIndex(from.slice(0, 7)) + 1,
      ),
  );
}
export function scheduleLabel(s: Schedule) {
  const labels: Record<string, string> = {
    once: "One time",
    daily: "Every day",
    days: "Selected weekdays",
    weekly: "Weekly",
    fortnightly: "Every 2 weeks",
    monthly: "Monthly",
    bimonthly: "Every 2 months",
    quarterly: "Every 3 months",
    yearly: "Yearly",
    irregular: "Irregular",
  };
  return s.frequency === "custom"
    ? `Every ${s.interval || 1} ${s.intervalUnit || "days"}`
    : labels[s.frequency];
}
export function emptyProfile(name = "friend"): Profile {
  return {
    id: "main",
    name,
    sources: [],
    categories: [
      "Transport",
      "Food & groceries",
      "Housing",
      "Data & airtime",
      "Education",
      "Health",
      "Family & giving",
      "Shopping",
      "Business",
      "Other",
    ],
    planningMode: "received",
    budgetStart: today().slice(0, 7),
    openingAllocations: {},
    created: today(),
    savingsTarget: 0,
  };
}
