import { useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CalendarDays,
  Eye,
  EyeOff,
  Leaf,
  Plus,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trash2,
} from "lucide-react";
import {
  budgetSummary,
  goalMonthly,
  money,
  monthLabel,
  ruleDates,
  ruleTotal,
  occurrenceCost,
  scheduleLabel,
  sourceAllocation,
  spending,
  today,
  walletBalance,
  yearSummary,
} from "../math";
import type { Entry, Goal, IncomeSource, Rule, Snapshot } from "../types";
import { Amount, CategoryIcon, Progress, SectionTitle } from "./UI";
import { LocalLottie } from "./Motion";

export function Empty({
  text,
  action,
  onClick,
}: {
  text: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="empty">
      <span className="empty-mark">
        <LocalLottie variant="growth" className="empty-animation" />
      </span>
      <p>{text}</p>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function EntryRow({
  entry: e,
  data,
  onClick,
}: {
  entry: Entry;
  data: Snapshot;
  onClick: () => void;
}) {
  return (
    <button className="expense-row transaction-row" onClick={onClick}>
      {e.type === "expense" ? (
        <CategoryIcon category={e.category} />
      ) : (
        <span
          className={`category-icon ${e.type === "income" ? "cat-income" : ""}`}
        >
          {e.type === "income" ? (
            <ArrowDownLeft size={20} />
          ) : (
            <ArrowLeftRight size={20} />
          )}
        </span>
      )}
      <span className="row-copy">
        <b>{e.note}</b>
        <small>
          {data.wallets.find((w) => w.id === e.walletId)?.name}
          {e.type === "transfer"
            ? ` → ${data.wallets.find((w) => w.id === e.toWalletId)?.name}`
            : ""}{" "}
          · {e.date.slice(8)}{" "}
          {monthLabel(e.date.slice(0, 7), true).split(" ")[0]}
        </small>
      </span>
      <strong className={e.type === "income" ? "positive" : ""}>
        <span className="private-value">
          {e.type === "income" ? "+" : e.type === "expense" ? "−" : ""}
          {money(e.amount)}
        </span>
        <small>RWF{e.ruleId ? " · planned" : ""}</small>
      </strong>
    </button>
  );
}
export function sortedEntries(data: Snapshot, month: string) {
  return data.entries
    .filter((e) => e.date.startsWith(month))
    .sort(
      (a, b) =>
        b.date.localeCompare(a.date) || (b.createdAt || 0) - (a.createdAt || 0),
    );
}
function BudgetGuide({
  onBuild,
  empty,
}: {
  onBuild: () => void;
  empty: boolean;
}) {
  return (
    <section className={`budget-guide ${empty ? "needs-plan" : ""}`}>
      <div>
        <b>
          {empty
            ? "No costs planned for this month yet"
            : "Planning a new month?"}
        </b>
        <p>
          {empty
            ? "Deleted a plan? You can build it again here. Choose your money, transport, meals and other costs. Your recorded money stays saved."
            : "Use the guide again, or edit any amount in Budget."}
        </p>
      </div>
      <button className="primary" onClick={onBuild}>
        <Plus size={17} />
        Build a budget
      </button>
    </section>
  );
}
type OverviewProps = {
  data: Snapshot;
  month: string;
  onRecord: () => void;
  onUnexpected: () => void;
  onRule: (r?: Rule) => void;
  onGoal: () => void;
  onBudget: () => void;
  onActivity: () => void;
  onWallets: () => void;
  onEntry: (e: Entry) => void;
  onPlanning: () => void;
  hidden: boolean;
  setHidden: (b: boolean) => void;
};
export function HomePage({
  data,
  month,
  onRecord,
  onUnexpected,
  onRule,
  onGoal,
  onBudget,
  onActivity,
  onWallets,
  onEntry,
  onPlanning,
  hidden,
  setHidden,
}: OverviewProps) {
  const s = budgetSummary(data, month),
    p = data.profile!,
    rules = data.rules.filter((r) => ruleDates(r, month).length),
    entries = sortedEntries(data, month);
  return (
    <>
      <section
        className={`balance-card ${s.remaining < 0 ? "over-budget" : ""}`}
      >
        <div className="balance-top">
          <span>
            <i />
            {p.planningMode === "expected"
              ? "EXPECTED INCOME PLAN"
              : "MONEY RECEIVED PLAN"}
          </span>
          <button
            aria-label={hidden ? "Show amounts" : "Hide amounts"}
            onClick={() => setHidden(!hidden)}
          >
            {hidden ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
        <p className="balance-label">
          {s.remaining < 0 ? "Your plan needs" : "Budget remaining"}
        </p>
        <div className="hero-amount private-value">
          {money(Math.abs(s.remaining))}
          <span>RWF</span>
        </div>
        <p className="balance-note">
          {s.remaining < 0
            ? "Your planned costs and reserve exceed this month’s funding."
            : s.unfunded > 0
              ? `Includes ${money(s.unfunded)} RWF still expected. This is a forecast, not your wallet balance.`
              : "After forecast expenses and your savings reserve. This is a plan, not your wallet balance."}
        </p>
        <div className="balance-divider" />
        <div className="balance-stats">
          <div>
            <span>
              <ArrowDownLeft size={14} />
              Funding for this plan
            </span>
            <b className="private-value">
              {money(s.available)} <small>RWF</small>
            </b>
          </div>
          <div>
            <span>
              <ArrowUpRight size={14} />
              Forecast expenses
            </span>
            <b className="private-value">
              {money(s.projected)} <small>RWF</small>
            </b>
          </div>
        </div>
        <div className="card-decoration" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      </section>
      <section className="actual-balance">
        <span>
          <ShieldCheck size={15} />
          Actual money now<small>Recorded wallet balances · {today()}</small>
        </span>
        <strong className="private-value">
          <Amount value={s.balance} />
        </strong>
      </section>
      <div className="funding-breakdown">
        <span>
          Received for this plan
          <b className="private-value">{money(s.received)} RWF</b>
        </span>
        <span>
          {p.planningMode === "expected"
            ? "Still expected"
            : "Scheduled · not included"}
          <b className="private-value">
            {money(p.planningMode === "expected" ? s.unfunded : s.expected)} RWF
          </b>
        </span>
      </div>
      <div className="quick-actions">
        <button onClick={onRecord}>
          <span>
            <Plus size={22} />
          </span>
          Record money
        </button>
        <button onClick={() => onRule()}>
          <span>
            <CalendarDays size={21} />
          </span>
          Plan a cost
        </button>
        <button onClick={onGoal}>
          <span>
            <Target size={21} />
          </span>
          Set a goal
        </button>
      </div>
      <button className="income-shortcut" onClick={onUnexpected}>
        <ArrowDownLeft size={17} />
        <span>Add unexpected income</span>
        <Plus size={16} />
      </button>
      <section className="insight-card">
        <span className="insight-icon">
          <Sparkles size={19} />
        </span>
        <div>
          <b>
            {p.sources.length
              ? "A little check-in goes a long way."
              : "Start with the money you have."}
          </b>
          <p>
            {p.sources.length
              ? "Record money when it arrives. Add what you spend each day. Check your plan once a week and change amounts when life changes."
              : "Cash, mobile money, sales, a salary or support from home all count. A plan helps you see what you need before spending."}
          </p>
          <button className="text-button" onClick={onPlanning}>
            Planning preferences
            <ArrowUpRight size={14} />
          </button>
        </div>
      </section>
      <SectionTitle
        title="This month’s plan"
        action="See budget"
        onClick={onBudget}
      />
      <div className="card budget-preview">
        {rules.length ? (
          rules.slice(0, 3).map((r) => (
            <button
              className="expense-row"
              key={r.id}
              onClick={() => onRule(r)}
            >
              <CategoryIcon category={r.category} />
              <span className="row-copy">
                <b>{r.name}</b>
                <small>
                  {scheduleLabel(r)} · {ruleDates(r, month).length} occurrences
                </small>
              </span>
              <strong>
                <span className="private-value">
                  <Amount value={ruleTotal(r, month)} suffix={false} />
                </span>
                <small>RWF / month</small>
              </strong>
            </button>
          ))
        ) : (
          <Empty
            text="Rent, groceries, work costs or something of your own. Start with one expense."
            action="Plan my first cost"
            onClick={() => onRule()}
          />
        )}
        <div className="card-footer">
          <span>Planned expenses</span>
          <b className="private-value">
            <Amount value={s.planned} />
          </b>
        </div>
      </div>
      <SectionTitle title="Your pockets" action="Manage" onClick={onWallets} />
      <div className="wallet-strip">
        {data.wallets.map((w, i) => (
          <div className="wallet-card" key={w.id}>
            <span className={`wallet-dot wallet-${i % 4}`} />
            <small>{w.name}</small>
            <b className="private-value">
              {money(walletBalance(w, data.entries))}
            </b>
            <span>RWF</span>
          </div>
        ))}
      </div>
      <p className="under-caption">
        Includes only opening balances and recorded transactions.
      </p>
      <SectionTitle
        title="Your latest moves"
        action="See all"
        onClick={onActivity}
      />
      <div className="card">
        {entries.length ? (
          entries
            .slice(0, 3)
            .map((e) => (
              <EntryRow
                key={e.id}
                entry={e}
                data={data}
                onClick={() => onEntry(e)}
              />
            ))
        ) : (
          <Empty text="Nothing recorded yet. Add your first expense or income when it happens." />
        )}
      </div>
      <div className="quiet-footer">
        <ShieldCheck size={14} />
        Just you and your money. Private by default.
      </div>
    </>
  );
}
export function BudgetPage({
  onBuild,
  data,
  month,
  onMonth,
  onRule,
  onSource,
  onPlanning,
  onCategories,
  onDelete,
}: {
  onBuild: () => void;
  data: Snapshot;
  month: string;
  onMonth: (m: string) => void;
  onRule: (r?: Rule) => void;
  onSource: (s?: IncomeSource) => void;
  onPlanning: () => void;
  onCategories: () => void;
  onDelete: (entity: "rule" | "source", id: string, name: string) => void;
}) {
  const [yearly, setYearly] = useState(false);
  const p = data.profile!,
    s = budgetSummary(data, month),
    rows = yearSummary(data, Number(month.slice(0, 4))),
    total = rows.reduce((a, r) => a + r.planned, 0);
  return (
    <>
      <BudgetGuide
        onBuild={onBuild}
        empty={!data.rules.some((r) => ruleDates(r, month).length)}
      />
      <div className="segmented view-toggle">
        <button
          className={!yearly ? "active" : ""}
          onClick={() => setYearly(false)}
        >
          Month
        </button>
        <button
          className={yearly ? "active" : ""}
          onClick={() => setYearly(true)}
        >
          Year
        </button>
      </div>
      {yearly ? (
        <>
          <section className="summary-panel">
            <p className="eyebrow">{month.slice(0, 4)} · THE BIG PICTURE</p>
            <h2>
              <Amount value={total} />
            </h2>
            <p>planned expenses across the year</p>
            <div className="summary-pair">
              <span>
                Funding for plans
                <b>
                  <Amount value={rows.reduce((a, r) => a + r.available, 0)} />
                </b>
              </span>
              <span>
                After forecasts & reserves
                <b>
                  <Amount value={rows.reduce((a, r) => a + r.remaining, 0)} />
                </b>
              </span>
            </div>
          </section>
          <p className="hint">
            Uses each source’s schedule and each cost’s actual dates. Only
            recorded receipts fund a “money received” plan. Annual figures
            reflect your current schedules and monthly reserve.
          </p>
          <div className="card year-list">
            <div className="year-head">
              <span>Month</span>
              <span>Planned / spent</span>
            </div>
            {rows.map((r) => (
              <button
                className={`year-row ${month === r.month ? "selected" : ""}`}
                key={r.month}
                onClick={() => {
                  onMonth(r.month);
                  setYearly(false);
                }}
              >
                <span>
                  <b>{monthLabel(r.month, true).split(" ")[0]}</b>
                  <small>{money(r.available)} funding</small>
                </span>
                <div>
                  <div className="year-bar">
                    <span
                      style={{
                        width: `${Math.min(100, r.available ? (r.planned / r.available) * 100 : r.planned ? 100 : 0)}%`,
                        background:
                          r.planned > r.available ? "#c96951" : undefined,
                      }}
                    />
                  </div>
                  <b>{money(r.planned)}</b>
                  <small>{money(r.spent)} spent</small>
                </div>
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <section className="summary-panel">
            <div className="section-title">
              <p className="eyebrow">MONTHLY PLAN</p>
              <button className="text-button" onClick={onPlanning}>
                Preferences
                <Settings2 size={14} />
              </button>
            </div>
            <h2>
              <Amount value={s.planned} />
            </h2>
            <p>planned expenses in {monthLabel(month).split(" ")[0]}</p>
            <Progress
              value={s.available ? (s.planned / s.available) * 100 : 0}
              className={s.planned > s.available ? "danger-progress" : ""}
            />
            <div className="summary-pair">
              <span>
                Funding for this plan
                <b>
                  <Amount value={s.available} />
                </b>
              </span>
              <span>
                Savings reserve
                <b>
                  <Amount value={s.reserve} />
                </b>
              </span>
            </div>
            <p className="hint">
              Mode:{" "}
              {p.planningMode === "expected"
                ? "Expected income + actual extras"
                : "Money received only"}
              . {money(s.received)} RWF received for this month;{" "}
              {money(s.opening)} RWF assigned from opening balances.
            </p>
          </section>
          {s.remaining < 0 && (
            <div className="warning">
              <b>Let’s find a little breathing room.</b>
              <p>
                The forecast and savings reserve exceed funding by{" "}
                {money(-s.remaining)} RWF. Adjust your costs, record income, or
                review your plan.
              </p>
            </div>
          )}
          <SectionTitle
            title="Your income sources"
            action="Add source"
            onClick={() => onSource()}
          />
          <div className="card">
            {p.sources.length ? (
              p.sources.map((source) => (
                <div className="source-item" key={source.id}>
                  <button
                    className="expense-row"
                    onClick={() => onSource(source)}
                  >
                    <span className="category-icon cat-income">
                      <ArrowDownLeft size={20} />
                    </span>
                    <span className="row-copy">
                      <b>{source.name}</b>
                      <small>
                        {source.kind} · {scheduleLabel(source)}
                        {source.coversMonths > 1
                          ? ` · covers ${source.coversMonths} months`
                          : ""}
                      </small>
                    </span>
                    <strong>
                      <Amount
                        value={sourceAllocation(source, month)}
                        suffix={false}
                      />
                      <small>RWF expected allocation</small>
                    </strong>
                  </button>
                  <button
                    className="source-remove"
                    aria-label={`Remove income source ${source.name}`}
                    onClick={() => onDelete("source", source.id, source.name)}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))
            ) : (
              <Empty
                text="Salary, sales, freelance work, support or a custom source. Add as many as you need."
                action="Add my first income source"
                onClick={() => onSource()}
              />
            )}
          </div>
          <SectionTitle
            title="Your planned costs"
            action="Add new"
            onClick={() => onRule()}
          />
          {data.rules.length ? (
            data.rules.map((r) => (
              <article className="card rule-card" key={r.id}>
                <div className="rule-heading">
                  <CategoryIcon category={r.category} />
                  <div className="row-copy">
                    <b>{r.name}</b>
                    <small>
                      {r.category} · {scheduleLabel(r)}
                      {r.frequency === "days" &&
                        ` · ${[1, 2, 3, 4, 5, 6, 0]
                          .filter((day) => r.weekdays.includes(day))
                          .map(
                            (day) =>
                              ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][
                                day
                              ],
                          )
                          .join(", ")}`}
                    </small>
                  </div>
                  <button
                    className="icon-button"
                    aria-label={`Edit ${r.name}`}
                    onClick={() => onRule(r)}
                  >
                    <Settings2 size={18} />
                  </button>
                </div>
                <div className="formula-line">
                  <span>
                    {r.parts?.length
                      ? money(occurrenceCost(r))
                      : `${money(r.amount)} × ${r.units}`}{" "}
                    × {ruleDates(r, month).length}{" "}
                    {r.frequency === "days" || r.frequency === "daily"
                      ? "days"
                      : "occurrences"}
                  </span>
                  <strong>
                    <Amount value={ruleTotal(r, month)} />
                  </strong>
                </div>
                {r.parts?.length && (
                  <div className="part-breakdown">
                    {r.parts.map((part) => (
                      <span key={part.id}>
                        <b>{part.name}</b>
                        <span>
                          {money(part.amount)}
                          {part.units > 1 ? ` × ${part.units}` : ""} RWF
                        </span>
                      </span>
                    ))}
                  </div>
                )}
                <div className="rule-footer">
                  <button onClick={() => onRule(r)}>
                    Edit amount & days
                    <ArrowUpRight size={13} />
                  </button>
                  <button
                    aria-label={`Delete ${r.name}`}
                    onClick={() => onDelete("rule", r.id, r.name)}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="card">
              <Empty
                text="Start with a simple amount. Add repeats, quantities or skip dates only when you need them."
                action="Plan my first expense"
                onClick={() => onRule()}
              />
            </div>
          )}
          <SectionTitle
            title="Plan vs. real life"
            action="Categories"
            onClick={onCategories}
          />
          <div className="card comparison">
            {p.categories
              .filter(
                (c) =>
                  data.rules.some((r) => r.category === c) ||
                  spending(data.entries, month, c) > 0,
              )
              .map((c) => {
                const target = data.rules
                    .filter((r) => r.category === c)
                    .reduce((a, r) => a + ruleTotal(r, month), 0),
                  actual = spending(data.entries, month, c);
                return (
                  <div key={c}>
                    <div className="compare-label">
                      <b>{c}</b>
                      <span>
                        {money(actual)} <small>/ {money(target)} RWF</small>
                      </span>
                    </div>
                    <Progress
                      value={
                        target ? (actual / target) * 100 : actual ? 100 : 0
                      }
                      className={actual > target ? "danger-progress" : ""}
                    />
                  </div>
                );
              })}
            <p className="hint">
              Recorded spending: {money(s.spent)} RWF. Forecast:{" "}
              {money(s.projected)} RWF, including unused planned costs and extra
              spending.
            </p>
          </div>
        </>
      )}
    </>
  );
}
export function ActivityPage({
  data,
  month,
  onEntry,
  onDelete,
  onRecord,
  onExport,
}: {
  data: Snapshot;
  month: string;
  onEntry: (e: Entry) => void;
  onDelete: (e: Entry) => void;
  onRecord: () => void;
  onExport: () => void;
}) {
  const [filter, setFilter] = useState("all");
  const entries = sortedEntries(data, month),
    visible = entries.filter((e) => filter === "all" || e.type === filter);
  return (
    <>
      <div className="activity-totals">
        <div>
          <span>
            <ArrowDownLeft size={15} />
            Received
          </span>
          <b>
            <Amount
              value={entries
                .filter((e) => e.type === "income")
                .reduce((a, e) => a + e.amount, 0)}
              suffix={false}
            />
          </b>
          <small>RWF this month</small>
        </div>
        <div>
          <span>
            <ArrowUpRight size={15} />
            Spent
          </span>
          <b>
            <Amount value={spending(data.entries, month)} suffix={false} />
          </b>
          <small>RWF this month</small>
        </div>
      </div>
      <div className="filter-row">
        {["all", "expense", "income", "transfer"].map((t) => (
          <button
            key={t}
            className={filter === t ? "active" : ""}
            onClick={() => setFilter(t)}
          >
            {t === "all" ? "All moves" : t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>
      <div className="card activity-list">
        {visible.length ? (
          visible.map((e) => (
            <div className="activity-item" key={e.id}>
              <EntryRow entry={e} data={data} onClick={() => onEntry(e)} />
              <button
                className="delete-entry"
                aria-label={`Delete ${e.note}`}
                onClick={() => onDelete(e)}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        ) : (
          <Empty
            text="Record what comes in and goes out. Your plan and wallet balances will update."
            action="Record a transaction"
            onClick={onRecord}
          />
        )}
      </div>
      <button className="secondary full" onClick={onExport}>
        Export this month as CSV
        <ArrowUpRight size={16} />
      </button>
      <p className="hint centered">
        Received is the actual payment total. Payments spread across months may
        fund more than one monthly plan. Transfers are excluded.
      </p>
    </>
  );
}
export function GoalsPage({
  data,
  onGoal,
  onDelete,
  onPlanning,
}: {
  data: Snapshot;
  onGoal: (g?: Goal) => void;
  onDelete: (g: Goal) => void;
  onPlanning: () => void;
}) {
  return (
    <>
      <section className="goal-hero">
        <span className="goal-illustration">
          <Leaf size={40} />
        </span>
        <p className="eyebrow">FUTURE YOU SAYS THANKS</p>
        <h2>
          <Amount value={data.goals.reduce((a, g) => a + g.saved, 0)} />
        </h2>
        <p>set aside across your goals</p>
        <button onClick={() => onGoal()}>
          Make room for something
          <Plus size={17} />
        </button>
      </section>
      <SectionTitle
        title="Things you’re building"
        action="New goal"
        onClick={() => onGoal()}
      />
      {data.goals.length ? (
        data.goals.map((g) => (
          <article className="card goal-card" key={g.id}>
            <div className="goal-top">
              <span className="category-icon cat-meals">
                <Target size={21} />
              </span>
              <div className="row-copy">
                <b>{g.name}</b>
                <small>By {g.deadline}</small>
              </div>
              <button
                className="icon-button"
                aria-label={`Delete ${g.name}`}
                onClick={() => onDelete(g)}
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="goal-amount">
              <b>
                <Amount value={g.saved} suffix={false} />
              </b>
              <span>of {money(g.target)} RWF</span>
              <strong>{Math.round((g.saved / g.target) * 100)}%</strong>
            </div>
            <Progress value={(g.saved / g.target) * 100} />
            <p className="hint">
              {g.saved >= g.target
                ? "You did it. Take a moment to enjoy this."
                : `${money(goalMonthly(g))} RWF / month to reach your goal${g.deadline < today() ? " · target date has passed" : ""}.`}
            </p>
            <button className="secondary full" onClick={() => onGoal(g)}>
              Update my progress
              <ArrowUpRight size={16} />
            </button>
          </article>
        ))
      ) : (
        <div className="card">
          <Empty
            text="An emergency cushion, your business, a home, or your next chapter. Give your savings a name."
            action="Create my first goal"
            onClick={() => onGoal()}
          />
        </div>
      )}
      <div className="insight-card">
        <ShieldCheck size={22} />
        <div>
          <b>Your goals, your pace.</b>
          <p>
            Progress tracks money you’ve set aside. A monthly reserve leaves
            room for goals in the plan; it doesn’t move money.
          </p>
          <button className="text-button" onClick={onPlanning}>
            Set my reserve
            <ArrowUpRight size={14} />
          </button>
        </div>
      </div>
    </>
  );
}
