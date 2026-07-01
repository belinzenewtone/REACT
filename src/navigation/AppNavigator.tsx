import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAppStore } from '../store';
import { useSQLiteContext } from 'expo-sqlite';
import { migrateDatabaseAsync } from '../database';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen } from '../screens/onboarding/OnboardingScreen';
import { AuthScreen } from '../screens/auth/AuthScreen';
import { LoadingScreen } from '../screens/auth/LoadingScreen';
import { TransactionFormScreen } from '../screens/finance/TransactionFormScreen';
import { SettingsScreen } from '../screens/settings/SettingsScreen';
import { PersonalInformationScreen } from '../screens/profile/PersonalInformationScreen';
import { PlannerHubScreen } from '../screens/planner/PlannerHubScreen';
import { BudgetsScreen } from '../screens/planner/BudgetsScreen';
import { BudgetFormScreen } from '../screens/planner/BudgetFormScreen';
import { IncomeScreen } from '../screens/planner/IncomeScreen';
import { RecurringScreen } from '../screens/planner/RecurringScreen';
import { BillsScreen } from '../screens/planner/BillsScreen';
import { LoansScreen } from '../screens/planner/LoansScreen';
import { GoalsScreen } from '../screens/planner/GoalsScreen';
import { ExportScreen } from '../screens/planner/ExportScreen';
import { IncomeFormScreen } from '../screens/planner/IncomeFormScreen';
import { RecurringFormScreen } from '../screens/planner/RecurringFormScreen';
import { BillFormScreen } from '../screens/planner/BillFormScreen';
import { LoanFormScreen } from '../screens/planner/LoanFormScreen';
import { GoalFormScreen } from '../screens/planner/GoalFormScreen';
import { CsvImportScreen } from '../screens/planner/CsvImportScreen';
import { AnalyticsScreen } from '../screens/analytics/AnalyticsScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { TransactionDetailScreen } from '../screens/finance/TransactionDetailScreen';
import { TaskFormScreen } from '../screens/tasks/TaskFormScreen';
import { TaskDetailScreen } from '../screens/tasks/TaskDetailScreen';
import { EventFormScreen } from '../screens/calendar/EventFormScreen';
import { EventDetailScreen } from '../screens/calendar/EventDetailScreen';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const db = useSQLiteContext();
  const { hasCompletedOnboarding, isAuthenticated, isLoading, setIsLoading, hasHydrated } = useAppStore();
  const [dbReady, setDbReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    async function init() {
      try {
        await migrateDatabaseAsync(db);
        if (mounted) setDbReady(true);
      } catch (error) {
        console.error('Database migration failed:', error);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }
    init();
    return () => {
      mounted = false;
    };
  }, [db, setIsLoading]);

  if (isLoading || !dbReady || !hasHydrated) {
    return <LoadingScreen />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!hasCompletedOnboarding ? (
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : !isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthScreen} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen name="TransactionForm" component={TransactionFormScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="PersonalInformation" component={PersonalInformationScreen} />
            <Stack.Screen name="Planner" component={PlannerHubScreen} />
            <Stack.Screen name="Budgets" component={BudgetsScreen} />
            <Stack.Screen name="BudgetForm" component={BudgetFormScreen} />
            <Stack.Screen name="Income" component={IncomeScreen} />
            <Stack.Screen name="IncomeForm" component={IncomeFormScreen} />
            <Stack.Screen name="Recurring" component={RecurringScreen} />
            <Stack.Screen name="RecurringForm" component={RecurringFormScreen} />
            <Stack.Screen name="Bills" component={BillsScreen} />
            <Stack.Screen name="BillForm" component={BillFormScreen} />
            <Stack.Screen name="Loans" component={LoansScreen} />
            <Stack.Screen name="LoanForm" component={LoanFormScreen} />
            <Stack.Screen name="Goals" component={GoalsScreen} />
            <Stack.Screen name="GoalForm" component={GoalFormScreen} />
            <Stack.Screen name="Export" component={ExportScreen} />
            <Stack.Screen name="CsvImport" component={CsvImportScreen} />
            <Stack.Screen name="Insights" component={AnalyticsScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
            <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
            <Stack.Screen name="TaskForm" component={TaskFormScreen} />
            <Stack.Screen name="EventDetail" component={EventDetailScreen} />
            <Stack.Screen name="EventForm" component={EventFormScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
