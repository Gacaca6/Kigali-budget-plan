import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { db, isDate } from "../db";
import { money, occurrenceCost, ruleDates, ruleTotal, today } from "../math";
import type { CostPart, Profile, Rule, Schedule } from "../types";
import { ActionForm, Amount, Field, text } from "./UI";
import { blankSchedule, ScheduleFields } from "./Forms";

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
    [units, setUnits] = useState(rule?.units || 1),
    [split, setSplit] = useState(!!rule?.parts?.length);
  const [parts, setParts] = useState<CostPart[]>(
    rule?.parts || [
      {
        id: crypto.randomUUID(),
        name: "Outbound",
        amount: rule?.amount || 0,
        units: 1,
      },
      {
        id: crypto.randomUUID(),
        name: "Return",
        amount: rule?.amount || 0,
        units: Math.max(1, (rule?.units || 2) - 1),
      },
    ],
  );
  const preview: Rule = {
    ...schedule,
    id: rule?.id || "",
    name: "",
    category: "Other",
    amount,
    units,
    parts: split ? parts : undefined,
  };
  const count = ruleDates(preview, month).length;
  function change(id: string, patch: Partial<CostPart>) {
    setParts((current) =>
      current.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    );
  }
  return (
    <ActionForm
      button={rule ? "Save changes" : "Add to my plan"}
      onSubmit={async (f) => {
        if (
          !isDate(schedule.start) ||
          (schedule.end &&
            (!isDate(schedule.end) || schedule.end < schedule.start))
        )
          throw new Error("Check the start and end dates.");
        if (schedule.frequency === "days" && !schedule.weekdays.length)
          throw new Error("Choose at least one weekday.");
        if (schedule.excluded.some((d) => !isDate(d)))
          throw new Error("Enter valid skip dates.");
        if (
          schedule.frequency === "custom" &&
          (!schedule.interval ||
            schedule.interval < 1 ||
            schedule.interval > 366)
        )
          throw new Error("Choose a valid repeat interval.");
        if (!text(f, "name")) throw new Error("Give this cost a name.");
        if (split && parts.some((p) => !p.name.trim()))
          throw new Error("Give each amount a name.");
        await db.rules.put({
          ...preview,
          id: rule?.id || crypto.randomUUID(),
          name: text(f, "name"),
          category: text(f, "category"),
          ...(split ? { amount: parts[0].amount, units: parts[0].units } : {}),
        });
        onDone();
      }}
    >
      <Field label="Expense name">
        <input
          name="name"
          defaultValue={rule?.name}
          maxLength={80}
          placeholder="e.g. Transport, groceries, rent"
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
      <label className="check-row">
        <input
          type="checkbox"
          checked={split}
          onChange={(e) => setSplit(e.target.checked)}
        />
        <span>
          <b>Use separate amounts</b>
          <small>Different outbound and return fares, or several items.</small>
        </span>
      </label>
      {split ? (
        <div className="cost-parts">
          {parts.map((part, i) => (
            <div className="cost-part" key={part.id}>
              <Field label={`Item ${i + 1} name`}>
                <input
                  value={part.name}
                  maxLength={60}
                  onChange={(e) => change(part.id, { name: e.target.value })}
                  required
                />
              </Field>
              <div className="form-grid">
                <Field label={`${part.name || `Item ${i + 1}`} amount`}>
                  <span className="money-input">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={1e12}
                      step={1}
                      value={part.amount}
                      onChange={(e) =>
                        change(part.id, { amount: Number(e.target.value) })
                      }
                      required
                    />
                    <span aria-hidden="true">RWF</span>
                  </span>
                </Field>
                <Field label={`${part.name || `Item ${i + 1}`} quantity`}>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    step={1}
                    value={part.units}
                    onChange={(e) =>
                      change(part.id, { units: Number(e.target.value) })
                    }
                    required
                  />
                </Field>
              </div>
              {parts.length > 1 && (
                <button
                  className="text-button"
                  type="button"
                  onClick={() =>
                    setParts(parts.filter((p) => p.id !== part.id))
                  }
                >
                  <Trash2 size={14} />
                  Remove item
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="secondary full"
            disabled={parts.length >= 20}
            onClick={() =>
              setParts([
                ...parts,
                {
                  id: crypto.randomUUID(),
                  name: `Item ${parts.length + 1}`,
                  amount: 0,
                  units: 1,
                },
              ])
            }
          >
            <Plus size={16} />
            Add another amount
          </button>
        </div>
      ) : (
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
      )}
      <ScheduleFields value={schedule} onChange={setSchedule} />
      {!split && (
        <details className="form-details" open={units !== 1 ? true : undefined}>
          <summary>Use a quantity (optional)</summary>
          <Field label="Quantity per occurrence">
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
      )}
      <div className="calculation">
        <span>This month’s calculation</span>
        {split && (
          <p>
            {parts
              .map(
                (p) =>
                  `${p.name}: ${money(p.amount)}${p.units > 1 ? ` × ${p.units}` : ""}`,
              )
              .join(" + ")}
          </p>
        )}
        <p>
          {split
            ? `${money(occurrenceCost(preview))}`
            : `${money(amount)} × ${units}`}{" "}
          × {count}{" "}
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
          Schedule changes recalculate this plan, including earlier months.
          Recorded spending is never rewritten. To change only future costs, end
          this schedule and add another starting on the change date.
        </p>
      )}
    </ActionForm>
  );
}
