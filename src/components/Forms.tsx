import { useState } from "react";
import { ArrowUp, ArrowDown } from "lucide-react";
import { db, isDate, renameCategory } from "../db";
import { LocalLottie } from "./Motion";
import {
  addMonth,
  emptyProfile,
  money,
  ruleDates,
  ruleTotal,
  today,
} from "../math";
import {
  frequencies,
  type Entry,
  type Goal,
  type IncomeSource,
  type Profile,
  type Rule,
  type Schedule,
  type Snapshot,
  type Wallet,
} from "../types";
import {
  ActionForm,
  Amount,
  Field,
  MoneyInput,
  WalletLogo,
  num,
  text,
} from "./UI";

const weekdayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function DayPicker({
  days,
  setDays,
}: {
  days: number[];
  setDays: (v: number[]) => void;
}) {
  return (
    <div className="day-picker" role="group" aria-label="Days of the week">
      {[1, 2, 3, 4, 5, 6, 0].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={weekdayLabels[n]}
          aria-pressed={days.includes(n)}
          onClick={() =>
            setDays(
              days.includes(n) ? days.filter((v) => v !== n) : [...days, n],
            )
          }
        >
          {weekdayLabels[n][0]}
        </button>
      ))}
    </div>
  );
}
export function blankSchedule(
  frequency: Schedule["frequency"] = "monthly",
  start = today(),
): Schedule {
  return {
    frequency,
    start,
    end: "",
    interval: 1,
    intervalUnit: "days",
    weekdays: [1, 2, 3, 4, 5],
    excluded: [],
  };
}
function validateSchedule(s: Schedule) {
  if (!isDate(s.start) || (s.end && (!isDate(s.end) || s.end < s.start)))
    throw new Error("Check your start and end dates.");
  if (s.frequency === "days" && !s.weekdays.length)
    throw new Error("Choose at least one weekday.");
  if (s.excluded.some((d) => !isDate(d)))
    throw new Error("Enter valid skip dates, separated by commas.");
  if (
    s.frequency === "custom" &&
    (!Number.isInteger(s.interval) ||
      !s.interval ||
      s.interval < 1 ||
      s.interval > 366)
  )
    throw new Error("Choose a repeat interval between 1 and 366.");
}
export function ScheduleFields({
  value,
  onChange,
  income = false,
}: {
  value: Schedule;
  onChange: (s: Schedule) => void;
  income?: boolean;
}) {
  const set = (patch: Partial<Schedule>) => onChange({ ...value, ...patch });
  const [excluded, setExcluded] = useState(value.excluded.join(", "));
  return (
    <>
      <Field label="How often?">
        <select
          value={value.frequency}
          onChange={(e) =>
            set({
              frequency: e.target.value as Schedule["frequency"],
              interval: value.interval || 1,
              intervalUnit: value.intervalUnit || "days",
            })
          }
        >
          {frequencies
            .filter((f) => income || f.value !== "irregular")
            .map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
        </select>
      </Field>
      {value.frequency === "custom" && (
        <div className="form-grid">
          <Field label="Repeat every">
            <input
              type="number"
              min={1}
              max={366}
              step={1}
              value={value.interval || 1}
              onChange={(e) => set({ interval: Number(e.target.value) })}
              required
            />
          </Field>
          <Field label="Interval unit">
            <select
              value={value.intervalUnit || "days"}
              onChange={(e) =>
                set({
                  intervalUnit: e.target.value as Schedule["intervalUnit"],
                })
              }
            >
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
            </select>
          </Field>
        </div>
      )}
      {value.frequency === "days" && (
        <div>
          <p className="field-caption">Repeat on</p>
          <DayPicker
            days={value.weekdays}
            setDays={(weekdays) => set({ weekdays })}
          />
        </div>
      )}
      {value.frequency !== "irregular" && (
        <details className="form-details">
          <summary>Dates & exceptions</summary>
          <div className="form-stack">
            <div className="form-grid">
              <Field
                label={
                  value.frequency === "once" ? "On this date" : "Start date"
                }
              >
                <input
                  type="date"
                  value={value.start}
                  onChange={(e) => set({ start: e.target.value })}
                  required
                />
              </Field>
              {value.frequency !== "once" && (
                <Field label="End date (optional)">
                  <input
                    type="date"
                    min={value.start}
                    value={value.end}
                    onChange={(e) => set({ end: e.target.value })}
                  />
                </Field>
              )}
            </div>
            {value.frequency !== "once" && (
              <Field
                label="Skip dates (optional)"
                hint="For holidays, breaks or any days that do not apply. Use commas between dates."
              >
                <textarea
                  value={excluded}
                  rows={2}
                  placeholder="2026-12-25, 2026-12-26"
                  onChange={(e) => {
                    setExcluded(e.target.value);
                    set({
                      excluded: e.target.value.split(/[\s,]+/).filter(Boolean),
                    });
                  }}
                />
              </Field>
            )}
          </div>
        </details>
      )}
    </>
  );
}

export function Onboarding({ onDone }: { onDone: () => void }) {
  const [template, setTemplate] = useState("blank"),
    [mode, setMode] = useState<Profile["planningMode"]>("received"),
    [days, setDays] = useState([1, 2, 3, 4, 5]);
  return (
    <div className="onboarding">
      <div className="brand">
        <WalletLogo />
        KoraBudget
      </div>
      <div className="welcome-art">
        <div className="orbit orbit-one" />
        <div className="orbit orbit-two" />
        <LocalLottie variant="wallet" className="welcome-animation" />
      </div>
      <h1>
        Your money.
        <br />A little <em>clearer.</em>
      </h1>
      <ActionForm
        button="Create my budget"
        onSubmit={async (f) => {
          const p = emptyProfile(text(f, "name") || "friend");
          p.planningMode = mode;
          const startMonth = text(f, "month"),
            start = `${startMonth}-01`,
            opening = num(f, "opening");
          p.budgetStart = startMonth;
          if (f.get("allocateOpening"))
            p.openingAllocations[startMonth] = opening;
          const rules: Rule[] = [];
          if (template === "student") {
            if (!days.length) throw new Error("Choose at least one weekday.");
            const amount = num(f, "income");
            if (amount > 0)
              p.sources.push({
                ...blankSchedule(
                  num(f, "months") === 2 ? "bimonthly" : "monthly",
                  start,
                ),
                id: crypto.randomUUID(),
                name: "Bursary",
                kind: "Bursary",
                amount,
                coversMonths: num(f, "months"),
              });
            for (const [key, category, name, units] of [
              ["ticket", "Transport", "Campus transport", num(f, "trips")],
              ["meal", "Food & groceries", "Campus meals", num(f, "meals")],
            ] as const)
              if (num(f, key) > 0)
                rules.push({
                  ...blankSchedule("days", start),
                  id: crypto.randomUUID(),
                  name,
                  category,
                  amount: num(f, key),
                  units,
                  weekdays: days,
                });
          }
          await db.transaction("rw", db.tables, async () => {
            await db.profiles.put(p);
            await db.rules.bulkPut(rules);
            await db.wallets.put({
              id: "cash",
              name: text(f, "walletName") || "Cash",
              opening,
              order: 0,
            });
          });
          void navigator.storage?.persist?.().catch(() => {});
          onDone();
        }}
      >
        <Field label="What should we call you?">
          <input
            name="name"
            maxLength={40}
            placeholder="Your first name"
            autoComplete="given-name"
          />
        </Field>
        <div className="setup-card">
          <div className="section-title">
            <h2>Your starting point</h2>
          </div>
          <div className="choice-cards">
            <button
              type="button"
              aria-pressed={template === "blank"}
              onClick={() => setTemplate("blank")}
            >
              <b>Start fresh</b>
            </button>
            <button
              type="button"
              aria-pressed={template === "student"}
              onClick={() => {
                setTemplate("student");
                setMode("expected");
              }}
            >
              <b>Student template</b>
            </button>
          </div>
          <Field label="First budget month">
            <input
              name="month"
              type="month"
              defaultValue={today().slice(0, 7)}
              required
            />
          </Field>
        </div>
        <div className="setup-card">
          <h2 className="small-heading">How would you like to plan?</h2>
          <ModePicker mode={mode} setMode={setMode} compact />
        </div>
        {template === "student" && (
          <div className="setup-card">
            <h2 className="small-heading">Your student routine</h2>
            <Field label="Bursary amount (optional)">
              <MoneyInput name="income" required={false} />
            </Field>
            <Field label="Payment covers">
              <select name="months" defaultValue={1}>
                <option value={1}>1 month</option>
                <option value={2}>2 months</option>
              </select>
            </Field>
            <p className="field-caption">Which days apply?</p>
            <DayPicker days={days} setDays={setDays} />
            <div className="form-grid">
              <Field label="Ticket, one way">
                <MoneyInput name="ticket" required={false} />
              </Field>
              <Field label="Trips each day">
                <input
                  name="trips"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={2}
                  required
                />
              </Field>
              <Field label="Cost per meal">
                <MoneyInput name="meal" required={false} />
              </Field>
              <Field label="Meals each day">
                <input
                  name="meals"
                  type="number"
                  min={1}
                  max={100}
                  defaultValue={1}
                  required
                />
              </Field>
            </div>
          </div>
        )}
        <details className="setup-card form-details">
          <summary>Have money to start with? (optional)</summary>
          <Field label="Wallet name">
            <input name="walletName" defaultValue="Cash" maxLength={60} />
          </Field>
          <Field label="Current balance">
            <MoneyInput name="opening" required={false} />
          </Field>
          <label className="check-row">
            <input name="allocateOpening" type="checkbox" defaultChecked />
            <span>
              <b>Use this balance in my first month’s plan</b>
            </span>
          </label>
        </details>
      </ActionForm>
    </div>
  );
}
export function ModePicker({
  mode,
  setMode,
  compact = false,
}: {
  mode: Profile["planningMode"];
  setMode: (v: Profile["planningMode"]) => void;
  compact?: boolean;
}) {
  return (
    <div className="choice-cards">
      <button
        type="button"
        aria-pressed={mode === "received"}
        onClick={() => setMode("received")}
      >
        <b>Money received</b>
        {!compact && <small>Plan with funds you have already recorded.</small>}
      </button>
      <button
        type="button"
        aria-pressed={mode === "expected"}
        onClick={() => setMode("expected")}
      >
        <b>Expected income</b>
        {!compact && (
          <small>Include scheduled income when planning ahead.</small>
        )}
      </button>
    </div>
  );
}

export function RuleForm({
  rule,
  month,
  profile,
  onDone,
}: {
  rule?: Rule;
  month: string;
  profile: Profile;
  onDone: () => void;
}) {
  const [schedule, setSchedule] = useState<Schedule>(
    rule ||
      blankSchedule(
        "once",
        month === today().slice(0, 7) ? today() : `${month}-01`,
      ),
  );
  const [amount, setAmount] = useState(rule?.amount || 0),
    [units, setUnits] = useState(rule?.units || 1);
  const preview: Rule = {
    ...schedule,
    id: rule?.id || "",
    name: "",
    category: "Other",
    amount,
    units,
  };
  const count = ruleDates(preview, month).length;
  return (
    <ActionForm
      button={rule ? "Save changes" : "Add to my plan"}
      onSubmit={async (f) => {
        validateSchedule(schedule);
        if (!text(f, "name")) throw new Error("Give this expense a name.");
        await db.rules.put({
          ...preview,
          id: rule?.id || crypto.randomUUID(),
          name: text(f, "name"),
          category: text(f, "category"),
        });
        onDone();
      }}
    >
      <Field label="Expense name">
        <input
          name="name"
          defaultValue={rule?.name}
          maxLength={80}
          placeholder="e.g. Rent, groceries, transport"
          required
        />
      </Field>
      <Field label="Category">
        <select
          name="category"
          defaultValue={rule?.category || profile.categories[0]}
        >
          {profile.categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </Field>
      <Field label="Amount">
        <span className="money-input">
          <input
            aria-label="Amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={1e12}
            step={1}
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
          <span aria-hidden="true">RWF</span>
        </span>
      </Field>
      <ScheduleFields value={schedule} onChange={setSchedule} />
      <details className="form-details" open={units !== 1 ? true : undefined}>
        <summary>Use a quantity (optional)</summary>
        <Field
          label="Quantity per occurrence"
          hint="For example: two one-way tickets, or three items."
        >
          <input
            type="number"
            min={1}
            max={100}
            step={1}
            value={units}
            onChange={(e) => setUnits(Number(e.target.value))}
            required
          />
        </Field>
      </details>
      <div className="calculation">
        <span>This month’s calculation</span>
        <p>
          {money(amount)} × {units} × {count}{" "}
          {schedule.frequency === "days" || schedule.frequency === "daily"
            ? "days"
            : "occurrences"}
        </p>
        <strong>
          <Amount value={ruleTotal(preview, month)} />
        </strong>
      </div>
      {rule && (
        <p className="hint">
          Editing this schedule recalculates earlier plans. Recorded
          transactions stay unchanged.
        </p>
      )}
    </ActionForm>
  );
}
const incomeKinds = [
  "Salary",
  "Business",
  "Freelance",
  "Bursary",
  "Family support",
  "Pension",
  "Other",
];
export function SourceForm({
  source,
  onDone,
}: {
  source?: IncomeSource;
  onDone: () => void;
}) {
  const [schedule, setSchedule] = useState<Schedule>(source || blankSchedule()),
    [kind, setKind] = useState(source?.kind || "Salary"),
    [covers, setCovers] = useState(source?.coversMonths || 1);
  return (
    <ActionForm
      button="Save income source"
      onSubmit={async (f) => {
        validateSchedule(schedule);
        const sourceName = text(f, "name"),
          type = kind === "Other" ? text(f, "customKind") || "Other" : kind;
        if (!sourceName) throw new Error("Give this income source a name.");
        const next: IncomeSource = {
          ...schedule,
          id: source?.id || crypto.randomUUID(),
          name: sourceName,
          kind: type,
          amount: num(f, "amount"),
          coversMonths: covers,
        };
        await db.transaction("rw", db.profiles, async () => {
          const p = (await db.profiles.get("main"))!;
          p.sources = source
            ? p.sources.map((s) => (s.id === source.id ? next : s))
            : [...p.sources, next];
          await db.profiles.put(p);
        });
        onDone();
      }}
    >
      <Field label="Income source name">
        <input
          name="name"
          defaultValue={source?.name}
          placeholder="e.g. My job, shop sales, weekend projects"
          maxLength={80}
          required
        />
      </Field>
      <Field label="Income type">
        <select
          value={incomeKinds.includes(kind) ? kind : "Other"}
          onChange={(e) => setKind(e.target.value)}
        >
          {incomeKinds.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
      </Field>
      {(kind === "Other" || !incomeKinds.includes(kind)) && (
        <Field label="Custom income type">
          <input
            name="customKind"
            defaultValue={kind === "Other" ? "" : kind}
            placeholder="Your own label"
            maxLength={60}
          />
        </Field>
      )}
      <ScheduleFields
        income
        value={schedule}
        onChange={(s) => {
          if (s.frequency !== schedule.frequency)
            setCovers(
              s.frequency === "bimonthly"
                ? 2
                : s.frequency === "quarterly"
                  ? 3
                  : 1,
            );
          setSchedule(s);
        }}
      />
      {schedule.frequency !== "irregular" ? (
        <Field label="Expected amount per payment">
          <MoneyInput name="amount" defaultValue={source?.amount} min={1} />
        </Field>
      ) : (
        <p className="hint">
          No amount or payment dates are assumed. Record each payment when it
          arrives.
        </p>
      )}
      <Field
        label="Spread each payment across"
        hint="Your wallet receives the full amount. Only the budget is divided between these months."
      >
        <select
          value={covers}
          onChange={(e) => setCovers(Number(e.target.value))}
        >
          {Array.from({ length: 24 }, (_, i) => (
            <option key={i + 1} value={i + 1}>
              {i + 1} {i ? "months" : "month"}
            </option>
          ))}
        </select>
      </Field>
      <p className="hint">
        An income source is a plan, not money received. Record actual payments
        separately and select this source to avoid counting twice.
      </p>
    </ActionForm>
  );
}

export function PlanningForm({
  data,
  month,
  onDone,
}: {
  data: Snapshot;
  month: string;
  onDone: () => void;
}) {
  const p = data.profile!;
  const [mode, setMode] = useState(p.planningMode);
  const otherAllocated = Object.entries(p.openingAllocations)
    .filter(([m]) => m !== month)
    .reduce((s, [, v]) => s + v, 0);
  const limit =
    data.wallets.reduce((s, w) => s + w.opening, 0) - otherAllocated;
  return (
    <ActionForm
      button="Save planning preferences"
      onSubmit={async (f) => {
        const allocation = num(f, "opening");
        if (allocation > limit)
          throw new Error(
            `Only ${money(Math.max(0, limit))} RWF of opening balances is available to allocate here.`,
          );
        const openingAllocations = {
          ...p.openingAllocations,
          [month]: allocation,
        };
        await db.profiles.update("main", {
          name: text(f, "name") || "friend",
          planningMode: mode,
          savingsTarget: num(f, "reserve"),
          openingAllocations,
        });
        onDone();
      }}
    >
      <Field label="Your name">
        <input name="name" defaultValue={p.name} maxLength={40} required />
      </Field>
      <ModePicker mode={mode} setMode={setMode} />
      <Field
        label="Monthly savings reserve"
        hint="A planning amount. It does not move money or debit your wallets."
      >
        <MoneyInput name="reserve" defaultValue={p.savingsTarget} />
      </Field>
      <Field
        label={`Opening balance allocated to ${month}`}
        hint={`${money(Math.max(0, limit))} RWF is available from opening balances. Other months' allocations stay reserved.`}
      >
        <MoneyInput
          name="opening"
          defaultValue={p.openingAllocations[month] || 0}
        />
      </Field>
      <p className="hint">
        New income is allocated through its transaction. Choose the budget month
        and how many months it covers. Linked payments replace expected income
        instead of being added twice.
      </p>
    </ActionForm>
  );
}

export function EntryForm({
  data,
  entry,
  onDone,
}: {
  data: Snapshot;
  entry?: Entry;
  onDone: () => void;
}) {
  const p = data.profile!;
  const [type, setType] = useState<Entry["type"]>(entry?.type || "expense"),
    [choice, setChoice] = useState(
      entry?.ruleId
        ? `rule:${entry.ruleId}`
        : `cat:${entry?.category || p.categories[0]}`,
    ),
    [sourceId, setSourceId] = useState(entry?.sourceId || "");
  const [amount, setAmount] = useState(entry?.amount || 0),
    [note, setNote] = useState(entry?.note || ""),
    [date, setDate] = useState(entry?.date || today()),
    [covers, setCovers] = useState(entry?.coversMonths || 1),
    [budgetMonth, setBudgetMonth] = useState(
      entry?.budgetMonth || entry?.date.slice(0, 7) || today().slice(0, 7),
    );
  const rule = choice.startsWith("rule:")
    ? data.rules.find((r) => r.id === choice.slice(5))
    : undefined;
  const category = rule?.category || choice.slice(4);
  return (
    <ActionForm
      button="Save transaction"
      onSubmit={async (f) => {
        if (!isDate(date) || date > today())
          throw new Error("Record money on the day it actually moved.");
        const walletId = text(f, "wallet");
        if (type === "transfer" && walletId === text(f, "toWallet"))
          throw new Error("Choose two different wallets.");
        await db.entries.put({
          id: entry?.id || crypto.randomUUID(),
          createdAt: entry?.createdAt || Date.now(),
          type,
          amount,
          date,
          walletId,
          category:
            type === "expense"
              ? category
              : p.categories.includes("Other")
                ? "Other"
                : p.categories[0],
          note:
            note.trim() ||
            (type === "income"
              ? "Income received"
              : type === "transfer"
                ? "Wallet transfer"
                : rule?.name || category),
          ...(type === "expense" && rule ? { ruleId: rule.id } : {}),
          ...(type === "income"
            ? {
                ...(sourceId ? { sourceId } : {}),
                budgetMonth,
                coversMonths: covers,
              }
            : {}),
          ...(type === "transfer" ? { toWalletId: text(f, "toWallet") } : {}),
        });
        onDone();
      }}
    >
      <div className="segmented">
        {(["expense", "income", "transfer"] as const).map((t) => (
          <button
            key={t}
            type="button"
            className={type === t ? "active" : ""}
            onClick={() => setType(t)}
          >
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      {type === "expense" && (
        <Field label="Category or planned cost">
          <select
            value={choice}
            onChange={(e) => {
              setChoice(e.target.value);
              if (e.target.value.startsWith("rule:")) {
                const r = data.rules.find(
                  (r) => r.id === e.target.value.slice(5),
                )!;
                setAmount(r.amount);
                setNote(r.name);
              }
            }}
          >
            {data.rules.length > 0 && (
              <optgroup label="Against a planned cost">
                {data.rules.map((r) => (
                  <option key={r.id} value={`rule:${r.id}`}>
                    {r.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Additional spending">
              {p.categories.map((c) => (
                <option key={c} value={`cat:${c}`}>
                  {c}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
      )}
      {type === "income" && (
        <Field label="Income source">
          <select
            value={sourceId}
            onChange={(e) => {
              const id = e.target.value;
              setSourceId(id);
              const source = p.sources.find((s) => s.id === id);
              if (source) {
                setAmount(source.amount);
                setCovers(source.coversMonths);
                setNote(source.name);
              }
            }}
          >
            <option value="">Other / one-off income</option>
            {p.sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Amount">
        <span className="money-input">
          <input
            aria-label="Amount"
            type="number"
            inputMode="numeric"
            min={1}
            max={1e12}
            step={1}
            value={amount || ""}
            onChange={(e) => setAmount(Number(e.target.value))}
            required
          />
          <span aria-hidden="true">RWF</span>
        </span>
      </Field>
      <Field label={type === "transfer" ? "From wallet" : "Wallet"}>
        <select
          name="wallet"
          defaultValue={entry?.walletId || data.wallets[0].id}
        >
          {data.wallets.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </Field>
      {type === "transfer" && (
        <Field label="To wallet">
          <select
            name="toWallet"
            defaultValue={
              entry?.toWalletId || data.wallets[1]?.id || data.wallets[0].id
            }
          >
            {data.wallets.map((w) => (
              <option key={w.id} value={w.id}>
                {w.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Note (optional)">
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What was it for?"
          maxLength={100}
        />
      </Field>
      <Field label="Date">
        <input
          type="date"
          value={date}
          max={today()}
          onChange={(e) => {
            setDate(e.target.value);
            if (!entry) setBudgetMonth(e.target.value.slice(0, 7));
          }}
          required
        />
      </Field>
      {type === "income" && (
        <details className="form-details">
          <summary>
            Budget allocation · {budgetMonth} · {covers}{" "}
            {covers === 1 ? "month" : "months"}
          </summary>
          <div className="form-stack">
            <Field label="First budget month">
              <input
                type="month"
                value={budgetMonth}
                onChange={(e) => setBudgetMonth(e.target.value)}
                required
              />
            </Field>
            <Field label="Payment covers">
              <select
                value={covers}
                onChange={(e) => setCovers(Number(e.target.value))}
              >
                {Array.from({ length: 24 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1} {i ? "months" : "month"}
                  </option>
                ))}
              </select>
            </Field>
            <p className="hint">
              {money(amount / covers)} RWF is allocated to each covered month.
              This changes the plan, not the payment date.
            </p>
          </div>
        </details>
      )}
      <p className="hint">
        {type === "transfer"
          ? "A transfer changes two wallets, not your income or spending."
          : type === "income"
            ? "This updates your wallet and the selected budget months. Linked payments replace the matching expected income; extra receipts increase the plan."
            : rule
              ? "This purchase counts against the selected planned cost on this date."
              : "This is additional spending. Select a planned cost above to count it against an existing routine."}
      </p>
    </ActionForm>
  );
}

export function GoalForm({
  goal,
  onDone,
}: {
  goal?: Goal;
  onDone: () => void;
}) {
  return (
    <ActionForm
      button={goal ? "Save goal" : "Create savings goal"}
      onSubmit={async (f) => {
        const target = num(f, "target"),
          saved = num(f, "saved");
        if (saved > target)
          throw new Error("The saved amount cannot exceed your goal.");
        if (!text(f, "name")) throw new Error("Give your goal a name.");
        await db.goals.put({
          id: goal?.id || crypto.randomUUID(),
          name: text(f, "name"),
          target,
          saved,
          deadline: text(f, "deadline"),
        });
        onDone();
      }}
    >
      <Field label="What are you saving for?">
        <input
          name="name"
          defaultValue={goal?.name}
          maxLength={80}
          placeholder="e.g. My emergency fund"
          required
        />
      </Field>
      <Field label="Target amount">
        <MoneyInput name="target" defaultValue={goal?.target} min={1} />
      </Field>
      <Field label="Already saved">
        <MoneyInput name="saved" defaultValue={goal?.saved || 0} />
      </Field>
      <Field label="Target date">
        <input
          type="date"
          name="deadline"
          defaultValue={
            goal?.deadline || `${addMonth(today().slice(0, 7), 5)}-28`
          }
          required
        />
      </Field>
      <p className="hint">
        Goals track money set aside. They do not move money between wallets.
        Keep each goal’s saved funds separate.
      </p>
    </ActionForm>
  );
}

export function WalletForm({
  wallet,
  data,
  onDone,
}: {
  wallet?: Wallet;
  data: Snapshot;
  onDone: () => void;
}) {
  return (
    <ActionForm
      button="Save wallet"
      onSubmit={async (f) => {
        const name = text(f, "name"),
          opening = num(f, "opening");
        if (!name) throw new Error("Give this wallet a name.");
        if (
          data.wallets.some(
            (w) =>
              w.id !== wallet?.id &&
              w.name.toLowerCase() === name.toLowerCase(),
          )
        )
          throw new Error("A wallet with that name already exists.");
        const total = data.wallets.reduce(
          (s, w) => s + (w.id === wallet?.id ? opening : w.opening),
          wallet ? 0 : opening,
        );
        const allocated = Object.values(
          data.profile!.openingAllocations,
        ).reduce((s, a) => s + a, 0);
        if (total < allocated)
          throw new Error(
            "Reduce your opening-balance allocations before reducing these balances.",
          );
        await db.wallets.put({
          id: wallet?.id || crypto.randomUUID(),
          name,
          opening,
          order: wallet
            ? (wallet.order ??
              data.wallets.findIndex((w) => w.id === wallet.id))
            : data.wallets.length,
        });
        onDone();
      }}
    >
      <Field label="Wallet name">
        <input
          name="name"
          defaultValue={wallet?.name}
          placeholder="e.g. Cash, MTN MoMo, savings group"
          maxLength={60}
          required
        />
      </Field>
      <Field
        label="Opening balance"
        hint="Balance before your recorded transactions. Use income transactions for new receipts."
      >
        <MoneyInput name="opening" defaultValue={wallet?.opening || 0} />
      </Field>
    </ActionForm>
  );
}
export function CategoryManager({ profile }: { profile: Profile }) {
  const [error, setError] = useState("");
  async function reorder(index: number, delta: number) {
    try {
      const next = [...profile.categories];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      await db.profiles.update("main", { categories: next });
    } catch {
      setError("Could not reorder categories.");
    }
  }
  return (
    <div className="form-stack">
      <p className="hint">
        Your labels, your order. Renaming also updates existing plans and
        transactions.
      </p>
      {profile.categories.map((c, i) => (
        <form
          key={c}
          className="manage-category"
          onSubmit={async (e) => {
            e.preventDefault();
            setError("");
            const next = new FormData(e.currentTarget)
              .get("name")
              ?.toString()
              .trim();
            if (!next) return;
            try {
              await renameCategory(c, next);
            } catch (e) {
              setError(e instanceof Error ? e.message : "Could not rename.");
            }
          }}
        >
          <input
            aria-label={`Category name ${c}`}
            name="name"
            defaultValue={c}
            maxLength={60}
            required
          />
          <button type="submit">Save</button>
          <button
            type="button"
            disabled={i === 0}
            aria-label={`Move ${c} up`}
            onClick={() => void reorder(i, -1)}
          >
            <ArrowUp size={15} />
          </button>
          <button
            type="button"
            disabled={i === profile.categories.length - 1}
            aria-label={`Move ${c} down`}
            onClick={() => void reorder(i, 1)}
          >
            <ArrowDown size={15} />
          </button>
        </form>
      ))}
      <ActionForm
        button="Add category"
        onSubmit={async (f) => {
          const name = text(f, "name");
          if (!name) throw new Error("Enter a category name.");
          if (
            profile.categories.some(
              (c) => c.toLowerCase() === name.toLowerCase(),
            )
          )
            throw new Error("That category already exists.");
          if (profile.categories.length >= 100)
            throw new Error("You can have up to 100 categories.");
          await db.profiles.update("main", {
            categories: [...profile.categories, name],
          });
        }}
      >
        <Field label="New category">
          <input
            name="name"
            maxLength={60}
            placeholder="e.g. Farming, childcare, subscriptions"
            required
          />
        </Field>
      </ActionForm>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
