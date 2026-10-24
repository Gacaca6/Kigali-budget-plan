export type Category = string;
export const categories = [
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
];
export type Frequency =
  | "once"
  | "daily"
  | "days"
  | "weekly"
  | "fortnightly"
  | "monthly"
  | "bimonthly"
  | "quarterly"
  | "yearly"
  | "custom"
  | "irregular";
export const frequencies: { value: Frequency; label: string }[] = [
  { value: "once", label: "One time" },
  { value: "daily", label: "Every day" },
  { value: "days", label: "On selected weekdays" },
  { value: "weekly", label: "Every week" },
  { value: "fortnightly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
  { value: "bimonthly", label: "Every 2 months" },
  { value: "quarterly", label: "Every 3 months" },
  { value: "yearly", label: "Every year" },
  { value: "custom", label: "Custom interval" },
  { value: "irregular", label: "Irregular / when it arrives" },
];
export interface Schedule {
  frequency: Frequency;
  start: string;
  end: string;
  interval?: number;
  intervalUnit?: "days" | "weeks" | "months";
  weekdays: number[];
  excluded: string[];
}
export interface IncomeSource extends Schedule {
  id: string;
  name: string;
  kind: string;
  amount: number;
  coversMonths: number;
}
export interface Profile {
  id: "main";
  name: string;
  sources: IncomeSource[];
  categories: string[];
  planningMode: "expected" | "received";
  budgetStart?: string;
  openingAllocations: Record<string, number>;
  created: string;
  savingsTarget: number;
}
export interface Rule extends Schedule {
  id: string;
  name: string;
  category: Category;
  amount: number;
  units: number;
}
export interface Wallet {
  id: string;
  name: string;
  opening: number;
  order?: number;
}
export interface Entry {
  id: string;
  createdAt?: number;
  type: "expense" | "income" | "transfer";
  amount: number;
  date: string;
  category: Category;
  note: string;
  walletId: string;
  toWalletId?: string;
  ruleId?: string;
  sourceId?: string;
  needsSourceReview?: boolean;
  budgetMonth?: string;
  coversMonths?: number;
}
export interface Goal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
}
export interface Snapshot {
  profile: Profile | undefined;
  rules: Rule[];
  entries: Entry[];
  wallets: Wallet[];
  goals: Goal[];
}
export interface Backup extends Snapshot {
  version: 2;
  exportedAt: string;
}
