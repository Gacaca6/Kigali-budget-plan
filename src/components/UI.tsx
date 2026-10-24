import {
  useEffect,
  useRef,
  useState,
  useId,
  Children,
  cloneElement,
  isValidElement,
  type ReactElement,
  type FormEvent,
  type ReactNode,
} from "react";
import {
  ArrowUpRight,
  BusFront,
  Utensils,
  House,
  Smartphone,
  GraduationCap,
  HeartPulse,
  HandHeart,
  Shapes,
  X,
} from "lucide-react";
import type { Category } from "../types";
import { money } from "../math";

export function CategoryIcon({ category }: { category: Category }) {
  const icons: Record<string, typeof Shapes> = {
    Transport: BusFront,
    Meals: Utensils,
    Housing: House,
    "Data & airtime": Smartphone,
    Education: GraduationCap,
    Health: HeartPulse,
    "Family & giving": HandHeart,
    Other: Shapes,
  };
  const Icon =
    icons[category] || (category === "Food & groceries" ? Utensils : Shapes);
  return (
    <span
      className={`category-icon cat-${category.split(" ")[0].toLowerCase()}`}
    >
      <Icon size={20} strokeWidth={1.8} />
    </span>
  );
}
export function WalletLogo({ large = false }: { large?: boolean }) {
  return (
    <img
      className={large ? "wallet-logo large" : "wallet-logo"}
      src="/icon.svg"
      alt="KoraBudget wallet"
      width={large ? 92 : 34}
      height={large ? 92 : 34}
    />
  );
}
export function Amount({
  value,
  suffix = true,
}: {
  value: number;
  suffix?: boolean;
}) {
  return (
    <span className="amount">
      {money(value)}
      {suffix && <small> RWF</small>}
    </span>
  );
}
export function SectionTitle({
  title,
  action,
  onClick,
}: {
  title: string;
  action?: string;
  onClick?: () => void;
}) {
  return (
    <div className="section-title">
      <h2>{title}</h2>
      {action && (
        <button className="text-button" onClick={onClick}>
          {action}
          <ArrowUpRight size={15} />
        </button>
      )}
    </div>
  );
}
export function Progress({
  value,
  className = "",
}: {
  value: number;
  className?: string;
}) {
  return (
    <div
      className={`progress ${className}`}
      role="progressbar"
      aria-valuenow={Math.round(Math.min(100, Math.max(0, value)))}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
export function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: ReactNode;
  hint?: string;
}) {
  const id = useId();
  const describedBy = hint ? `${id}-hint` : undefined;
  function bind(nodes: ReactNode): ReactNode {
    return Children.map(nodes, (child) => {
      if (!isValidElement(child)) return child;
      const element = child as ReactElement<Record<string, unknown>>;
      if (child.type === MoneyInput)
        return cloneElement(element, { inputId: id, describedBy });
      if (["input", "select", "textarea"].includes(String(child.type)))
        return cloneElement(element, { id, "aria-describedby": describedBy });
      return element.props.children
        ? cloneElement(element, {
            children: bind(element.props.children as ReactNode),
          })
        : child;
    });
  }
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {bind(children)}
      {hint && <small id={describedBy}>{hint}</small>}
    </div>
  );
}
export function MoneyInput({
  name,
  defaultValue,
  required = true,
  min = 0,
  placeholder = "0",
  inputId,
  describedBy,
}: {
  name: string;
  defaultValue?: number;
  required?: boolean;
  min?: number;
  placeholder?: string;
  inputId?: string;
  describedBy?: string;
}) {
  return (
    <span className="money-input">
      <input
        id={inputId}
        aria-describedby={describedBy}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={1000000000000}
        step="1"
        defaultValue={defaultValue}
        placeholder={placeholder}
        required={required}
      />
      <span aria-hidden="true">RWF</span>
    </span>
  );
}
export function ActionForm({
  children,
  onSubmit,
  button = "Save",
  className = "",
}: {
  children: ReactNode;
  onSubmit: (data: FormData) => Promise<void>;
  button?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy) return;
    const data = new FormData(e.currentTarget);
    setBusy(true);
    setError("");
    try {
      await onSubmit(data);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className={`form-stack ${className}`} onSubmit={submit}>
      {children}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary" disabled={busy} type="submit">
        {busy ? "Saving…" : button}
        <ArrowUpRight size={18} />
      </button>
    </form>
  );
}
export function Sheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current!;
    d.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      d.close();
      document.body.style.overflow = "";
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="sheet-content">
        <div className="sheet-handle" />
        <div className="sheet-heading">
          <div>
            <h2 id="sheet-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          <button className="icon-button" onClick={onClose} aria-label="Close">
            <X size={21} />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}
export const text = (f: FormData, key: string) =>
  String(f.get(key) || "").trim();
export const num = (f: FormData, key: string) => Number(f.get(key) || 0);
