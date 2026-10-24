import { useEffect, useRef, useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  ArrowDownToLine,
  ArrowDown,
  ArrowUp,
  ArrowLeftRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Download,
  House,
  Plus,
  Settings2,
  ShieldCheck,
  Tags,
  Target,
  Upload,
  Wallet,
} from "lucide-react";
import { db, restore, snapshot, validateBackup } from "./db";
import { addMonth, money, monthLabel, today, walletBalance } from "./math";
import type {
  Backup,
  Entry,
  Goal,
  IncomeSource,
  Rule,
  Snapshot,
  Wallet as WalletType,
} from "./types";
import { ActionForm, Sheet, WalletLogo } from "./components/UI";
import { LocalLottie } from "./components/Motion";
import {
  CategoryManager,
  EntryForm,
  GoalForm,
  Onboarding,
  PlanningForm,
  SourceForm,
  WalletForm,
} from "./components/Forms";
import { RuleForm } from "./components/RuleForm";
import {
  ActivityPage,
  BudgetPage,
  GoalsPage,
  HomePage,
  sortedEntries,
} from "./components/Pages";

type Tab = "Home" | "Budget" | "Activity" | "Goals";
type Modal =
  | { kind: "rule"; rule?: Rule }
  | { kind: "entry"; entry?: Entry; initialType?: Entry["type"] }
  | { kind: "goal"; goal?: Goal }
  | { kind: "source"; source?: IncomeSource }
  | { kind: "wallet"; wallet?: WalletType }
  | { kind: "planning" | "settings" | "wallets" | "categories" | "help" }
  | { kind: "restore"; backup: Backup }
  | {
      kind: "delete";
      entity: "rule" | "entry" | "goal" | "source";
      id: string;
      name: string;
    };
interface InstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: string }>;
}
export default function App() {
  const data = useLiveQuery(snapshot, []);
  const [tab, setTab] = useState<Tab>("Home"),
    [month, setMonth] = useState(today().slice(0, 7)),
    [modal, setModal] = useState<Modal | null>(null),
    [toast, setToast] = useState(""),
    [hidden, setHidden] = useState(false),
    [online, setOnline] = useState(navigator.onLine),
    [install, setInstall] = useState<InstallEvent | null>(null),
    [controlled, setControlled] = useState(
      !!navigator.serviceWorker?.controller,
    );
  const fileRef = useRef<HTMLInputElement>(null);
  const {
    offlineReady: [ready],
    needRefresh: [updateAvailable],
    updateServiceWorker,
  } = useRegisterSW();
  useEffect(() => {
    const network = () => setOnline(navigator.onLine),
      prompt = (e: Event) => {
        e.preventDefault();
        setInstall(e as InstallEvent);
      },
      controller = () => setControlled(!!navigator.serviceWorker?.controller);
    window.addEventListener("online", network);
    window.addEventListener("offline", network);
    window.addEventListener("beforeinstallprompt", prompt);
    navigator.serviceWorker?.addEventListener("controllerchange", controller);
    return () => {
      window.removeEventListener("online", network);
      window.removeEventListener("offline", network);
      window.removeEventListener("beforeinstallprompt", prompt);
      navigator.serviceWorker?.removeEventListener(
        "controllerchange",
        controller,
      );
    };
  }, []);
  useEffect(() => {
    if (toast) {
      const id = setTimeout(() => setToast(""), 4500);
      return () => clearTimeout(id);
    }
  }, [toast]);
  useEffect(() => {
    const update = () => {
      const viewport = window.visualViewport;
      document.documentElement.style.setProperty(
        "--visible-height",
        `${viewport?.height || window.innerHeight}px`,
      );
      document.documentElement.style.setProperty(
        "--keyboard-inset",
        `${Math.max(0, window.innerHeight - ((viewport?.height || window.innerHeight) + (viewport?.offsetTop || 0)))}px`,
      );
    };
    update();
    window.visualViewport?.addEventListener("resize", update);
    window.addEventListener("resize", update);
    return () => {
      window.visualViewport?.removeEventListener("resize", update);
      window.removeEventListener("resize", update);
      document.documentElement.style.removeProperty("--visible-height");
      document.documentElement.style.removeProperty("--keyboard-inset");
    };
  }, []);
  const close = () => setModal(null),
    done = () => {
      setModal(null);
      setToast("Saved on this device");
    };
  function navigate(t: Tab) {
    setTab(t);
    window.scrollTo({ top: 0, behavior: "instant" });
  }
  async function exportBackup() {
    try {
      download(
        JSON.stringify(
          {
            ...(await snapshot()),
            version: 2,
            exportedAt: new Date().toISOString(),
          },
          null,
          2,
        ),
        `korabudget-${today()}.json`,
        "application/json",
      );
      setToast("Backup downloaded. Keep it somewhere safe.");
    } catch {
      setToast("Could not export. Please try again.");
    }
  }
  async function importBackup(file?: File) {
    if (!file) return;
    try {
      if (file.size > 15000000)
        throw new Error("Choose a backup smaller than 15 MB.");
      const backup = validateBackup(JSON.parse(await file.text()));
      if (!data?.profile) {
        await restore(backup);
        setToast("Backup restored");
      } else setModal({ kind: "restore", backup });
    } catch (e) {
      setToast(e instanceof Error ? e.message : "Could not read this backup.");
    }
  }
  const fileInput = (
    <input
      hidden
      ref={fileRef}
      type="file"
      accept="application/json,.json"
      onChange={async (e) => {
        await importBackup(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );
  if (!data)
    return (
      <div className="app-shell loading">
        <WalletLogo />
        <p>Making room for your money…</p>
      </div>
    );
  if (!data.profile)
    return (
      <main className="app-shell">
        {updateAvailable && (
          <div className="update-banner">
            <span>A fresh version is ready.</span>
            <button onClick={() => void updateServiceWorker(true)}>
              Update app
            </button>
          </div>
        )}
        <Onboarding
          onDone={() => {
            setMonth(today().slice(0, 7));
            setToast("Your budget is ready. Make it yours.");
          }}
        />
        <button
          className="restore-welcome text-button"
          onClick={() => fileRef.current?.click()}
        >
          <Upload size={16} />
          Restore a backup
        </button>
        {fileInput}
        {toast && (
          <div className="toast" role="status">
            {toast}
          </div>
        )}
      </main>
    );
  const profile = data.profile;
  async function moveWallet(index: number, delta: number) {
    try {
      const next = [...data!.wallets];
      [next[index], next[index + delta]] = [next[index + delta], next[index]];
      await db.wallets.bulkPut(next.map((w, i) => ({ ...w, order: i })));
    } catch {
      setToast("Could not reorder wallets.");
    }
  }
  async function removeItem(m: Extract<Modal, { kind: "delete" }>) {
    if (m.entity === "entry") await db.entries.delete(m.id);
    else if (m.entity === "goal") await db.goals.delete(m.id);
    else if (m.entity === "rule")
      await db.transaction("rw", db.rules, db.entries, async () => {
        await db.rules.delete(m.id);
        await db.entries
          .filter((e) => e.ruleId === m.id)
          .modify((e) => {
            delete e.ruleId;
            delete e.partId;
          });
      });
    else
      await db.transaction("rw", db.profiles, db.entries, async () => {
        const p = (await db.profiles.get("main"))!;
        await db.profiles.update("main", {
          sources: p.sources.filter((s) => s.id !== m.id),
        });
        await db.entries
          .filter((e) => e.sourceId === m.id)
          .modify((e) => {
            delete e.sourceId;
          });
      });
    done();
  }
  return (
    <div className={`app-shell app-active ${hidden ? "privacy-mode" : ""}`}>
      <header className="app-header">
        <div className="brand">
          <WalletLogo />
          KoraBudget
        </div>
        <button
          className="avatar"
          aria-label="Settings"
          onClick={() => setModal({ kind: "settings" })}
        >
          {(profile.name[0] || "K").toUpperCase()}
        </button>
      </header>
      <main className="main-content motion-page" key={tab}>
        {updateAvailable && (
          <div className="update-banner">
            <span>A fresh version is ready.</span>
            <button onClick={() => void updateServiceWorker(true)}>
              Update app
            </button>
          </div>
        )}
        <div className="page-heading">
          <p className="eyebrow">
            {tab === "Home"
              ? "A LITTLE CLARITY, EVERY DAY"
              : tab === "Budget"
                ? "A PLAN THAT FITS YOUR LIFE"
                : tab === "Activity"
                  ? "EVERY LITTLE BIT COUNTS"
                  : "MAKE ROOM FOR TOMORROW"}
          </p>
          <h1>
            {tab === "Home" ? (
              <>
                Hey, {profile.name}
                <span className="greeting-dot">.</span>
              </>
            ) : tab === "Budget" ? (
              "Your money, mapped."
            ) : tab === "Activity" ? (
              "The little details."
            ) : (
              "Big things start small."
            )}
          </h1>
          <p className="page-subtitle">
            {tab === "Home"
              ? "Your life. Your income. Your kind of budget."
              : tab === "Budget"
                ? "Start simple. Shape it around your needs."
                : tab === "Activity"
                  ? "A clear picture of what comes in and goes out."
                  : "Save with a purpose. One step at a time."}
          </p>
        </div>
        {tab !== "Goals" && (
          <div className="month-bar">
            <div className="month-control">
              <button
                aria-label="Previous month"
                onClick={() => setMonth(addMonth(month, -1))}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                <CalendarDays size={15} />
                {monthLabel(month)}
              </span>
              <button
                aria-label="Next month"
                onClick={() => setMonth(addMonth(month, 1))}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <span className="offline-indicator">
              <i />
              {!online
                ? "Offline"
                : ready || controlled
                  ? "Offline ready"
                  : "On this device"}
            </span>
          </div>
        )}
        {data.entries.some((e) => e.needsSourceReview) && (
          <div className="warning">
            <b>Review older income receipts.</b>
            <p>
              The earlier version did not link receipts to income sources. Open
              each older income transaction and choose its source—or confirm it
              as other income—to avoid counting scheduled payments twice.
            </p>
            <button
              className="text-button"
              onClick={() => navigate("Activity")}
            >
              Review transactions
            </button>
          </div>
        )}
        {tab === "Home" && (
          <HomePage
            data={data}
            month={month}
            hidden={hidden}
            setHidden={setHidden}
            onRecord={() => setModal({ kind: "entry" })}
            onUnexpected={() =>
              setModal({ kind: "entry", initialType: "income" })
            }
            onRule={(rule) => setModal({ kind: "rule", rule })}
            onGoal={() => setModal({ kind: "goal" })}
            onBudget={() => navigate("Budget")}
            onActivity={() => navigate("Activity")}
            onWallets={() => setModal({ kind: "wallets" })}
            onEntry={(entry) => setModal({ kind: "entry", entry })}
            onPlanning={() => setModal({ kind: "planning" })}
          />
        )}
        {tab === "Budget" && (
          <BudgetPage
            data={data}
            month={month}
            onMonth={setMonth}
            onRule={(rule) => setModal({ kind: "rule", rule })}
            onSource={(source) => setModal({ kind: "source", source })}
            onPlanning={() => setModal({ kind: "planning" })}
            onCategories={() => setModal({ kind: "categories" })}
            onDelete={(entity, id, name) =>
              setModal({ kind: "delete", entity, id, name })
            }
          />
        )}
        {tab === "Activity" && (
          <ActivityPage
            data={data}
            month={month}
            onEntry={(entry) => setModal({ kind: "entry", entry })}
            onDelete={(entry) =>
              setModal({
                kind: "delete",
                entity: "entry",
                id: entry.id,
                name: entry.note,
              })
            }
            onRecord={() => setModal({ kind: "entry" })}
            onExport={() => exportCSV(sortedEntries(data, month), data)}
          />
        )}
        {tab === "Goals" && (
          <GoalsPage
            data={data}
            onGoal={(goal) => setModal({ kind: "goal", goal })}
            onDelete={(g) =>
              setModal({
                kind: "delete",
                entity: "goal",
                id: g.id,
                name: g.name,
              })
            }
            onPlanning={() => setModal({ kind: "planning" })}
          />
        )}
      </main>
      <nav className="bottom-nav" aria-label="Main navigation">
        {(["Home", "Budget", "Activity", "Goals"] as Tab[]).map((item, i) => {
          const Icon = [House, CalendarDays, ArrowLeftRight, Target][i];
          return (
            <button
              key={item}
              className={tab === item ? "active" : ""}
              aria-current={tab === item ? "page" : undefined}
              onClick={() => navigate(item)}
            >
              <span>
                <Icon size={21} strokeWidth={tab === item ? 2.2 : 1.7} />
              </span>
              {item}
            </button>
          );
        })}
        <button
          className="nav-add"
          aria-label="Record money"
          onClick={() => setModal({ kind: "entry" })}
        >
          <Plus size={24} />
        </button>
      </nav>
      {fileInput}
      {toast && (
        <div className="toast" role="status">
          <LocalLottie variant="success" className="toast-animation" />
          {toast}
        </div>
      )}
      {modal && (
        <Sheet
          title={
            modal.kind === "rule"
              ? modal.rule
                ? "Fine-tune your plan"
                : "Plan a little ahead"
              : modal.kind === "entry"
                ? "A little money move"
                : modal.kind === "goal"
                  ? modal.goal
                    ? "A step closer"
                    : "What’s your next goal?"
                  : modal.kind === "source"
                    ? modal.source
                      ? "Edit income source"
                      : "Add an income source"
                    : modal.kind === "wallet"
                      ? modal.wallet
                        ? "Edit your wallet"
                        : "Add a wallet"
                      : modal.kind === "wallets"
                        ? "Your pockets"
                        : modal.kind === "categories"
                          ? "Your categories"
                          : modal.kind === "planning"
                            ? "Your planning preferences"
                            : modal.kind === "settings"
                              ? "Make yourself at home"
                              : modal.kind === "help"
                                ? "A little clarity"
                                : modal.kind === "restore"
                                  ? "Restore your budget?"
                                  : "Remove this item?"
          }
          onClose={close}
        >
          {modal.kind === "rule" && (
            <RuleForm
              rule={modal.rule}
              month={month}
              profile={profile}
              onDone={done}
            />
          )}
          {modal.kind === "entry" && (
            <EntryForm
              data={data}
              entry={modal.entry}
              initialType={modal.initialType}
              onDone={done}
            />
          )}
          {modal.kind === "goal" && (
            <GoalForm goal={modal.goal} onDone={done} />
          )}
          {modal.kind === "source" && (
            <SourceForm source={modal.source} onDone={done} />
          )}
          {modal.kind === "planning" && (
            <PlanningForm data={data} month={month} onDone={done} />
          )}
          {modal.kind === "wallet" && (
            <WalletForm data={data} wallet={modal.wallet} onDone={done} />
          )}
          {modal.kind === "categories" && <CategoryManager profile={profile} />}
          {modal.kind === "wallets" && (
            <div className="form-stack">
              <p className="hint">
                Add or rename any wallet: cash, mobile money, a bank, savings
                group, or something else. Arrange them in your preferred order.
              </p>
              {data.wallets.map((w, i) => (
                <div className="manage-wallet" key={w.id}>
                  <button
                    className="wallet-edit"
                    onClick={() => setModal({ kind: "wallet", wallet: w })}
                  >
                    <Wallet size={19} />
                    <span>
                      <b>{w.name}</b>
                      <small>
                        {money(walletBalance(w, data.entries))} RWF · edit name
                        & opening balance
                      </small>
                    </span>
                    <Settings2 size={16} />
                  </button>
                  <div>
                    <button
                      aria-label={`Move ${w.name} up`}
                      disabled={i === 0}
                      onClick={() => void moveWallet(i, -1)}
                    >
                      <ArrowUp size={16} />
                    </button>
                    <button
                      aria-label={`Move ${w.name} down`}
                      disabled={i === data.wallets.length - 1}
                      onClick={() => void moveWallet(i, 1)}
                    >
                      <ArrowDown size={16} />
                    </button>
                  </div>
                </div>
              ))}
              <button
                className="primary"
                onClick={() => setModal({ kind: "wallet" })}
              >
                Add wallet
                <Plus size={17} />
              </button>
            </div>
          )}
          {modal.kind === "settings" && (
            <div className="settings-list">
              <div className="settings-intro">
                <ShieldCheck size={24} />
                <div>
                  <b>Your money belongs to you.</b>
                  <p>
                    Stored on this device. No account, trackers, or paid APIs.
                  </p>
                </div>
              </div>
              <button onClick={() => setModal({ kind: "planning" })}>
                <Settings2 size={19} />
                <span>
                  Planning preferences
                  <small>Expected or received income, savings reserve</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button
                onClick={() => {
                  close();
                  navigate("Budget");
                }}
              >
                <Wallet size={19} />
                <span>
                  Income sources
                  <small>Add salary, business, support or your own</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => setModal({ kind: "wallets" })}>
                <Wallet size={19} />
                <span>
                  Manage wallets<small>Your names, balances and order</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => setModal({ kind: "categories" })}>
                <Tags size={19} />
                <span>
                  Manage categories
                  <small>Add, rename and arrange your labels</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => void exportBackup()}>
                <Download size={19} />
                <span>
                  Back up my budget
                  <small>Download a complete JSON backup</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => fileRef.current?.click()}>
                <Upload size={19} />
                <span>
                  Restore a backup
                  <small>Supports this version and older backups</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button onClick={() => setModal({ kind: "help" })}>
                <CircleHelp size={19} />
                <span>
                  How KoraBudget works
                  <small>Money, plans and offline use</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <button
                onClick={async () => {
                  try {
                    if (install) {
                      await install.prompt();
                      if ((await install.userChoice).outcome === "accepted")
                        setInstall(null);
                    } else
                      setToast(
                        "iPhone: Share → Add to Home Screen. Android: browser menu → Install app.",
                      );
                  } catch {
                    setToast(
                      "Use your browser’s Install or Add to Home Screen option.",
                    );
                  }
                }}
              >
                <ArrowDownToLine size={19} />
                <span>
                  Install on your phone
                  <small>Your free offline budget companion</small>
                </span>
                <ChevronRight size={17} />
              </button>
              <p className="hint">
                Back up regularly. Clearing browser data or losing your phone
                can remove this budget. Backups contain personal financial data;
                keep them private.
              </p>
              <p className="version">KoraBudget 2.0 · Made for your everyday</p>
            </div>
          )}
          {modal.kind === "help" && (
            <div className="help-copy">
              <h3>Choose your way to plan.</h3>
              <p>
                Money received mode uses recorded receipts allocated to this
                month and any assigned opening balance. Expected income mode
                includes scheduled allocations plus extra receipts. Your wallet
                balance always shows actual recorded money, independently of the
                plan.
              </p>
              <h3>Different incomes. One picture.</h3>
              <p>
                Add multiple sources with separate types and schedules. Daily,
                weekly, fortnightly, monthly, yearly, custom and irregular
                income are supported. Spread a payment over several months when
                it needs to last longer. Irregular sources never invent expected
                payments.
              </p>
              <h3>Record payments without doubling them.</h3>
              <p>
                Select the source when recording income. For each source and
                month, the plan uses the larger of expected allocations or
                received allocations. Additional income without a source also
                funds the plan. The receipt form lets you change the first
                budget month and months covered.
              </p>
              <h3>Plan costs as simply as you need.</h3>
              <p>
                Enter an amount, category and recurrence. Quantities, dates and
                exceptions are optional. Scheduled dates use the real calendar;
                monthly dates clamp to the last day of short months. Select a
                planned cost when recording an expense to avoid counting it
                twice.
              </p>
              <h3>Make it yours.</h3>
              <p>
                Add, rename or reorder wallets and categories in Settings. Goal
                balances are manual trackers; a savings reserve leaves room in
                the monthly plan without moving money. Unspent funds do not
                automatically roll to the next month. Adjust payment coverage or
                assign opening balances explicitly.
              </p>
              <h3>Keep a copy.</h3>
              <p>
                Open online once and wait for Offline ready. The app then works
                offline. Download JSON backups regularly; CSV is for reading. A
                lost phone, browser reset or storage eviction can remove local
                data. Backups are unencrypted.
              </p>
            </div>
          )}
          {modal.kind === "restore" && (
            <ActionForm
              button="Replace with this backup"
              onSubmit={async () => {
                await restore(modal.backup);
                done();
              }}
            >
              <p>
                Replace this device’s budget with{" "}
                <b>{modal.backup.profile!.name}’s</b> backup:{" "}
                {modal.backup.rules.length} costs, {modal.backup.entries.length}{" "}
                transactions and {modal.backup.goals.length} goals.
              </p>
              <button
                className="secondary full"
                type="button"
                onClick={() => void exportBackup()}
              >
                Back up current data first
                <Download size={16} />
              </button>
            </ActionForm>
          )}
          {modal.kind === "delete" && (
            <ActionForm button="Remove item" onSubmit={() => removeItem(modal)}>
              <p>
                Remove <b>{modal.name}</b>?{" "}
                {modal.entity === "rule"
                  ? "Recorded transactions stay, but become additional spending."
                  : modal.entity === "source"
                    ? "Recorded receipts stay with their budget allocations. Only the source’s future expectations are removed."
                    : modal.entity === "entry"
                      ? "Wallet balances and budget totals will be recalculated."
                      : "This removes the tracker without changing wallet balances."}
              </p>
              <button className="secondary full" type="button" onClick={close}>
                Keep it
              </button>
            </ActionForm>
          )}
        </Sheet>
      )}
    </div>
  );
}
function download(content: string, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportCSV(entries: Entry[], data: Snapshot) {
  const escape = (s: string) =>
    `"${(/^[=+\-@\t\r]/.test(s) ? "'" : "") + s.replaceAll('"', '""')}"`;
  const rows = [
    [
      "Date",
      "Type",
      "Amount RWF",
      "Category",
      "Wallet",
      "To wallet",
      "Income source",
      "First budget month",
      "Months covered",
      "Note",
    ],
    ...entries.map((e) => [
      e.date,
      e.type,
      String(e.amount),
      e.category,
      data.wallets.find((w) => w.id === e.walletId)?.name || "",
      data.wallets.find((w) => w.id === e.toWalletId)?.name || "",
      data.profile!.sources.find((s) => s.id === e.sourceId)?.name || "",
      e.budgetMonth || "",
      String(e.coversMonths || ""),
      e.note,
    ]),
  ];
  download(
    "\ufeff" + rows.map((r) => r.map(escape).join(",")).join("\r\n"),
    `korabudget-activity-${today()}.csv`,
    "text/csv;charset=utf-8",
  );
}
