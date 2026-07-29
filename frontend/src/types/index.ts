export interface User {
  id: string;
  email: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface FinancialSummary {
  totalIncome: number;
  totalFixedExpense: number;
  totalVariableExpense: number;
  currentSavings: number;
  emergencyFund: number;
  emergencyUsageLimit: number;
}

export interface FinancialProfile {
  id: string;
  userId: string;
  emergencyFund: number;
  emergencyUsageLimit: number;
  currency: string;
}

export interface FundingStrategy {
  savingsUsed: number;
  remainingBalanceUsed: number;
  emergencyUsed: number;
}

export interface FundingStep {
  source: string;
  used: number;
  remainingAfterStep: number;
  available: number;
}

export interface FundingBreakdown {
  totalNeeded: number;
  steps: FundingStep[];
  finalShortfall: number;
}

export interface Confidence {
  recommendation: number;
  pattern: number;
}

export interface PurchaseAdvice {
  recommendation: string;
  pattern: string;
  confidence: Confidence;
  recommendationProbability: Record<string, number>;
  patternProbability: Record<string, number>;
  fundingStrategy: FundingStrategy;
  fundingBreakdown: FundingBreakdown;
  financialSummary: Record<string, number>;
  engineeredFeatures: Record<string, number>;
  businessExplanation: string;
  suggestions: string[];
  waitPeriodSuggestion?: string;
  processingTimeMs: number;
  modelVersion: string;
  currency: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

export interface HistoryRecord {
  id: string;
  userId: string;
  purchasePrice: number;
  recommendation: string;
  pattern: string;
  confidenceRec: number;
  confidencePat: number;
  processingTimeMs: number;
  createdAt: string;
}

export interface TransactionAllocation {
  accountId: string;
  amount: number;
}

export interface FinanceAccount {
  id: string;
  userId: string;
  name: string;
  type: 'Cash' | 'Bank' | 'Card' | 'Wallet' | 'Other' | 'Savings' | 'EmergencyFund';
  initialBalance: number;
  currentBalance: number;
  spendingThreshold: number | null;
  parentId?: string | null;
  isSubAccount?: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: { transactions: number; subAccounts?: number };
  subAccounts?: FinanceAccount[];
}

export interface Category {
  id: string;
  userId: string;
  name: string;
  type: 'INCOME' | 'EXPENSE';
  isEssential: boolean;
  parentId?: string | null;
  createdAt: string;
  transactionCount?: number;
  _count?: { transactions: number; subCategories: number };
  subCategories?: Category[];
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string | null;
  categoryId: string | null;
  amount: number;
  transactionType: 'INCOME' | 'EXPENSE';
  transactionNature: string;
  splits?: TransactionAllocation[] | null;
  date: string;
  description: string | null;
  goalId: string | null;
  taskId: string | null;
  recurringId: string | null;
  recurringFrequency: string | null;
  recurringNextDate: string | null;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
  account?: FinanceAccount | null;
  goal?: Goal | null;
}

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  priority: 'Low' | 'Medium' | 'High';
  dueDate: string | null;
  completed: boolean;
  categoryId: string | null;
  isGoal: boolean;
  targetAmount: number | null;
  goalPeriodStart: string | null;
  goalPeriodEnd: string | null;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  category?: Category | null;
  subtasks: Subtask[];
  goal?: Goal | null;
}

export interface Subtask {
  id: string;
  taskId: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

export interface Goal {
  id: string;
  userId: string;
  taskId: string;
  targetAmount: number | null;
  periodStart: string | null;
  periodEnd: string | null;
  categoryId: string | null;
  progress: number;
  createdAt: string;
  updatedAt: string;
  task?: Task;
  category?: Category | null;
  transactions?: Transaction[];
}

export interface DashboardData {
  summary: {
    totalIncome: number;
    totalExpense: number;
    balance: number;
    currentSavings: number;
    emergencyFund: number;
    emergencyUsageLimit: number;
    currency: string;
  };
  recentTransactions: Transaction[];
  accounts: FinanceAccount[];
  todayTasks: Task[];
  categories: Category[];
  accountAlerts: { accountId: string; name: string; balance: number; threshold: number }[];
}

export interface Emi {
  id: string;
  userId: string;
  name: string;
  totalAmount: number;
  monthlyEmi: number;
  remainingAmount: number;
  interestRate: number | null;
  tenureMonths: number | null;
  startDate: string;
  endDate: string;
  dueDay: number | null;
  downPayment: number | null;
  processingFee: number | null;
  prepaymentAmount: number | null;
  loanAccountNumber: string | null;
  notes: string | null;
  category: string | null;
  lender: string | null;
  accountId: string | null;
  lastPaidDate: string | null;
  createdAt: string;
  updatedAt: string;
  account?: { id: string; name: string } | null;
  totalMonths?: number;
  elapsedMonths?: number;
  remainingMonths?: number;
  daysToEnd?: number;
  isActive?: boolean;
  isPaidThisMonth?: boolean;
  computedRemaining?: number;
  totalPayable?: number;
  totalInterest?: number;
  progress?: number;
  nextPaymentDate?: string;
}

export interface AmortizationEntry {
  period: number;
  openingBalance: number;
  emi: number;
  interest: number;
  principal: number;
  closingBalance: number;
}

export interface EmiSummary {
  totalMonthlyEmi: number;
  totalRemaining: number;
  activeCount: number;
  totalCount: number;
}

export interface Subscription {
  id: string;
  userId: string;
  name: string;
  amount: number;
  billingPeriod?: 'MONTHLY' | 'YEARLY';
  startDate: string;
  endDate?: string | null;
  skipUntil?: string | null;
  nextBilling: string;
  category: string | null;
  accountId: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  account?: { id: string; name: string } | null;
  daysToBilling?: number;
  daysToEnd?: number;
  monthsRemaining?: number;
  monthlyAmount?: number;
  isDue?: boolean;
  isSkipped?: boolean;
}

export interface SubscriptionSummary {
  totalMonthly: number;
  activeCount: number;
  dueSoon: number;
}
