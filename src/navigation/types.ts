import type { NavigatorScreenParams } from '@react-navigation/native';

export type MainTabParamList = {
  Home: undefined;
  Finance: undefined;
  Calendar: undefined;
  Assistant: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  // Shared / global screens
  Tasks: undefined;
  Events: undefined;
  Planner: undefined;
  Budgets: undefined;
  Income: undefined;
  IncomeForm: { incomeId?: string };
  Recurring: undefined;
  RecurringForm: { ruleId?: string };
  Bills: undefined;
  BillForm: { billId?: string };
  Loans: undefined;
  LoanForm: { loanId?: string };
  Goals: undefined;
  GoalForm: { goalId?: string };
  Search: undefined;
  Settings: undefined;
  PersonalInformation: undefined;
  Export: undefined;
  CsvImport: { fileUri?: string; fileName?: string } | undefined;
  Insights: undefined;
  TransactionDetail: { transactionId: string };
  TransactionForm: { transactionId?: string };
  Categorize: undefined;
  TaskDetail: { taskId: string };
  TaskForm: { taskId?: string };
  EventDetail: { eventId: string };
  EventForm: { eventId?: string; type?: 'event' | 'birthday' | 'anniversary' | 'countdown' };
  BudgetDetail: { budgetId: string };
  BudgetForm: { budgetId?: string };
  // New screens
  FeeAnalytics: undefined;
  MerchantDetail: { merchant: string };
  ReviewQueue: undefined;
  SmsImportHealth: undefined;
  Changelog: undefined;
  Learning: undefined;
  WeekReview: undefined;
  MonthlyWrapped: undefined;
  ScreenLock: undefined;
  Notifications: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
