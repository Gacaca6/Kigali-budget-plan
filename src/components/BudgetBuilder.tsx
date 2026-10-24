import { useRef, useState } from "react";
import { db, isDate } from "../db";
import {
  addMonth,
  allocationPart,
  money,
  monthLabel,
  ruleDates,
  ruleTotal,
} from "../math";
import type { IncomeSource, Rule, Snapshot } from "../types";
import { blankSchedule, DayPicker, ModePicker } from "./Forms";
import { ActionForm, Field } from "./UI";

const routines = [
  ["student", "Student", "Bursary or support, transport and meals."],
  ["work", "Work & everyday life", "Salary, transport, food and home costs."],
  [
    "flexible",
    "Income changes",
    "Sales, casual jobs, freelance work or support.",
  ],
  ["custom", "My own plan", "Choose the amounts and days that suit you."],
] as const;

export function BudgetBuilder({
  data,
  month,
  onDone,
}: {
  data: Snapshot;
  month: string;
  onDone: (month: string) => void;
}) {
  const [step, setStep] = useState(0);
  const [routine, setRoutine] = useState("custom");
  const [selectedMonth, setMonth] = useState(month);
  const [incomeName, setIncomeName] = useState("");
  const [income, setIncome] = useState(0);
  const [covers, setCovers] = useState(1);
  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [outbound, setOutbound] = useState(0);
  const [returnFare, setReturn] = useState(0);
  const [food, setFood] = useState(0);
  const [rent, setRent] = useState(0);
  const [dataCost, setDataCost] = useState(0);
  const [otherName, setOtherName] = useState("");
  const [otherCost, setOtherCost] = useState(0);
  const [mode, setMode] = useState(data.profile!.planningMode);
  const heading = useRef<HTMLHeadingElement>(null);
  function next(value: number) {
    setStep(value);
    // Focus the new step so keyboard and screen-reader users start at its heading.
    requestAnimationFrame(() => {
      heading.current?.focus();
      heading.current?.scrollIntoView({ block: "start" });
    });
  }
  const start = `${selectedMonth}-01`;
  const last = new Date(
    Number(selectedMonth.slice(0, 4)),
    Number(selectedMonth.slice(5, 7)),
    0,
  ).getDate();
  const end = `${selectedMonth}-${last}`;
  const rules: Rule[] = [];
  function cost(name: string, category: string, amount: number, daily = false) {
    if (amount <= 0) return;
    rules.push({
      ...blankSchedule(daily ? "days" : "once", start),
      end,
      id: String(rules.length),
      name,
      category,
      amount,
      units: 1,
      weekdays: days,
    });
  }
  cost("Transport", "Transport", outbound + returnFare, true);
  if (rules[0]?.name === "Transport") {
    rules[0].amount = outbound;
    rules[0].parts = [
      { id: "outbound", name: "Outbound", amount: outbound, units: 1 },
      { id: "return", name: "Return", amount: returnFare, units: 1 },
    ];
  }
  cost("Meals", "Food & groceries", food, true);
  cost("Rent", "Housing", rent);
  cost("Data & airtime", "Data & airtime", dataCost);
  cost(otherName.trim() || "Other cost", "Other", otherCost);
  const total = rules.reduce((sum, r) => sum + ruleTotal(r, selectedMonth), 0);
  const monthlyIncome = allocationPart(income, covers, 0);
  const transportDays = rules[0]?.parts
    ? ruleDates(rules[0], selectedMonth).length
    : 0;
  const existing = data.rules.filter(
    (r) => ruleTotal(r, selectedMonth) > 0,
  ).length;
  function amount(
    label: string,
    value: number,
    set: (n: number) => void,
    hint?: string,
  ) {
    return (
      <Field label={label} hint={hint}>
        <span className="money-input">
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={1e12}
            step={1}
            value={value || ""}
            placeholder="0"
            onChange={(e) => set(Number(e.target.value))}
          />
          <span aria-hidden="true">RWF</span>
        </span>
      </Field>
    );
  }
  return (
    <ActionForm
      button={
        step === 0
          ? "Next: my money & costs"
          : step === 1
            ? "Review my budget"
            : "Save this budget"
      }
      onSubmit={async () => {
        if (!isDate(start)) throw new Error("Choose a valid budget month.");
        if (step < 2) {
          if (step === 1 && outbound + returnFare + food > 0 && !days.length)
            throw new Error("Choose the days you need transport or meals.");
          if (step === 1 && !income && !rules.length)
            throw new Error(
              "Add money you expect, or at least one cost. An estimate is enough to begin.",
            );
          if (step === 1 && income > 0 && !incomeName.trim())
            throw new Error("Give your money source a name.");
          next(step + 1);
          return;
        }
        await db.transaction("rw", db.profiles, db.rules, async () => {
          const profile = await db.profiles.get("main");
          if (!profile)
            throw new Error(
              "Your budget could not be found. Please reopen the app.",
            );
          if (income > 0) {
            const source: IncomeSource = {
              ...blankSchedule("once", start),
              id: crypto.randomUUID(),
              name: incomeName.trim(),
              kind:
                routine === "student"
                  ? "Bursary"
                  : routine === "work"
                    ? "Salary"
                    : "Other",
              amount: income,
              coversMonths: covers,
            };
            profile.sources.push(source);
          }
          const categories = [
            ...new Set([
              ...profile.categories,
              ...rules.map((r) => r.category),
            ]),
          ];
          await db.profiles.put({ ...profile, categories, planningMode: mode });
          await db.rules.bulkPut(
            rules.map((r) => ({
              ...r,
              id: crypto.randomUUID(),
              parts: r.parts?.map((p) => ({ ...p, id: crypto.randomUUID() })),
            })),
          );
        });
        onDone(selectedMonth);
      }}
    >
      <p className="builder-progress">
        Step {step + 1} of 3 · You can change every amount later
      </p>
      <h3 ref={heading} tabIndex={-1} className="builder-heading">
        {
          [
            "What fits your life?",
            "What money is coming in, and what will you need?",
            "Here is your monthly plan",
          ][step]
        }
      </h3>
      {step === 0 && (
        <>
          <p className="hint">
            A budget is simply deciding what your money needs to do before you
            spend it. Start small. You do not need a salary or perfect numbers.
          </p>
          <div className="choice-cards builder-choices">
            {routines.map(([id, title, description]) => (
              <button
                key={id}
                type="button"
                aria-pressed={routine === id}
                onClick={() => {
                  setRoutine(id);
                  setIncomeName(
                    id === "student"
                      ? "Bursary"
                      : id === "work"
                        ? "Salary"
                        : "",
                  );
                }}
              >
                <b>{title}</b>
                <small>{description}</small>
              </button>
            ))}
          </div>
          <Field label="Month to plan">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </Field>
          <p className="hint">
            This creates a plan for the chosen month. You can use this guide
            again for another month.
          </p>
        </>
      )}
      {step === 1 && (
        <>
          <section className="setup-card">
            <h4>1. Money you expect</h4>
            <p className="hint">
              A bursary, salary, sales or family support. Leave blank if you do
              not know yet. Add more sources later in Budget.
            </p>
            <Field label="Where will the money come from?">
              <input
                value={incomeName}
                onChange={(e) => setIncomeName(e.target.value)}
                maxLength={80}
                placeholder="e.g. Casual work, business, family support"
              />
            </Field>
            {amount("Expected payment", income, setIncome)}
            <Field label="How long must this payment last?">
              <select
                value={covers}
                onChange={(e) => setCovers(Number(e.target.value))}
              >
                {[1, 2, 3, 6, 12].map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? "month" : "months"}
                  </option>
                ))}
              </select>
            </Field>
            <p className="hint">
              For example, 80,000 RWF lasting 2 months means 40,000 RWF for each
              month. This payment is added once. Record it in Activity when it
              arrives.
            </p>
          </section>
          <section className="setup-card">
            <h4>2. Costs on your usual days</h4>
            <p className="hint">
              Choose the days you travel or buy meals. We count the dates in{" "}
              {monthLabel(selectedMonth)} for you. Use zero for anything you do
              not need.
            </p>
            <DayPicker days={days} setDays={setDays} />
            {amount(
              "Going there",
              outbound,
              setOutbound,
              "One day's outbound fare, including any connections.",
            )}
            {amount(
              "Coming back",
              returnFare,
              setReturn,
              "The return fare can be a different amount.",
            )}
            {amount(
              "Food for one day",
              food,
              setFood,
              "Total for the meals you buy on each chosen day.",
            )}
          </section>
          <section className="setup-card">
            <h4>3. Other costs for this month</h4>
            {amount("Rent this month", rent, setRent)}
            {amount("Data & airtime this month", dataCost, setDataCost)}
            <Field label="Another cost (optional)">
              <input
                value={otherName}
                onChange={(e) => setOtherName(e.target.value)}
                maxLength={80}
                placeholder="e.g. School fees, family support, business stock"
              />
            </Field>
            {amount("Amount for that cost this month", otherCost, setOtherCost)}
            <p className="hint">
              After saving, use Add new in Budget for school fees, family
              support, business costs or anything else.
            </p>
          </section>
        </>
      )}
      {step === 2 && (
        <>
          <p className="hint">
            {monthLabel(selectedMonth)} · These are the new items you are
            adding.
          </p>
          <div className="builder-review">
            <p>
              <span>Money expected for this month</span>
              <b>{money(monthlyIncome)} RWF</b>
            </p>
            {rules.map((r) => (
              <p key={r.id}>
                <span>
                  {r.name}
                  {r.frequency === "days" ? " · chosen days" : ""}
                </span>
                <b>{money(ruleTotal(r, selectedMonth))} RWF</b>
              </p>
            ))}
            <p className="builder-total">
              <span>New costs this month</span>
              <b>{money(total)} RWF</b>
            </p>
          </div>
          {outbound + returnFare > 0 && (
            <p className="hint">
              Transport: ({money(outbound)} going + {money(returnFare)}{" "}
              returning) × {transportDays} days. Each fare stays separately
              editable.
            </p>
          )}
          {income > 0 && total > monthlyIncome && (
            <p className="warning">
              These new costs are more than this payment's monthly share. Review
              what you can change, or add other money you expect. Your full
              Budget includes any money and costs already saved.
            </p>
          )}
          {(existing > 0 || data.profile!.sources.length > 0) && (
            <p className="warning">
              You already have saved plan items. These new items will be added
              alongside them. Go back if you meant to edit an existing item
              instead.
            </p>
          )}
          <h4>What money should Home count in your plan?</h4>
          <ModePicker mode={mode} setMode={setMode} />
          <p className="hint">
            This choice applies to all your budgets. Saving a plan does not add
            cash to your wallet. Record payments when they arrive and check
            Actual money now before spending.
          </p>
          {covers > 1 && income > 0 && (
            <p className="hint">
              This payment is shared from {monthLabel(selectedMonth)} through{" "}
              {monthLabel(addMonth(selectedMonth, covers - 1))}. Costs here
              apply only to {monthLabel(selectedMonth)}.
            </p>
          )}
          <p className="hint">
            A small habit: record what came in and what you spent each day. Once
            a week, check what is left. When you can, set a savings goal in
            Goals.
          </p>
        </>
      )}
      {step > 0 && (
        <button
          type="button"
          className="secondary"
          onClick={() => next(step - 1)}
        >
          Back: change my answers
        </button>
      )}
    </ActionForm>
  );
}
