import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, IconButton, Button, TouchableRipple, useTheme } from 'react-native-paper';
import { useSQLiteContext } from 'expo-sqlite';
import { usePlannerStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { EmptyState } from '../../components/common/EmptyState';
import { LifeOSSwitch } from '../../components/common/LifeOSSwitch';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { spacing, borderRadius, BOTTOM_NAV_SAFE_AREA } from '../../theme';
import { animateLayout } from '../../utils/animation';

export function RecurringScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const { recurringRules, loadAll, updateRecurringRule, deleteRecurringRule } = usePlannerStore();
  const [banner, setBanner] = useState<string | null>(null);

  useEffect(() => {
    loadAll(db);
  }, [db, loadAll]);

  const handleToggle = (id: string, enabled: boolean) => {
    const rule = recurringRules.find((r) => r.id === id);
    updateRecurringRule(db, id, { enabled });
    setBanner(`${rule?.title ?? 'Rule'} ${enabled ? 'enabled' : 'paused'}`);
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert('Delete rule', `Remove ${title}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          animateLayout();
          deleteRecurringRule(db, id);
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={banner ?? ''} visible={!!banner} autoDismissMs={2000} onDismiss={() => setBanner(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.onSurface} />}
            onPress={() => navigation.goBack()}
          />
          <View style={styles.headerTextCol}>
            <Text variant="labelSmall" style={{ color: theme.colors.primary }}>
              AUTOMATION
            </Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
              Recurring
            </Text>
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
              Subscriptions and repeating items
            </Text>
          </View>
          <IconButton
            icon={() => <Ionicons name="add" size={22} color={theme.colors.primary} />}
            onPress={() => navigation.navigate('RecurringForm')}
          />
        </View>

        {recurringRules.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title="No recurring rules yet"
            subtitle="Add a rule to automate subscriptions, bills, or repeating tasks."
          />
        ) : (
          recurringRules.map((rule) => (
            <TouchableRipple
              key={rule.id}
              onPress={() => navigation.navigate('RecurringForm', { ruleId: rule.id })}
              style={{ marginBottom: spacing.base }}
              rippleColor={theme.colors.primary}
            >
              <GlassCard style={styles.card}>
                <View style={styles.row}>
                  <View style={styles.contentCol}>
                    <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                      {rule.title}
                    </Text>
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textTransform: 'capitalize' }}>
                      {rule.type} · {rule.cadence} · Next: {formatDate(rule.next_run_at, 'dd MMM yyyy')}
                    </Text>
                  </View>
                  <View style={styles.trailingCol}>
                    {rule.amount ? (
                      <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                        {formatCurrency(rule.amount)}
                      </Text>
                    ) : null}
                    <LifeOSSwitch value={!!rule.enabled} onValueChange={(v) => handleToggle(rule.id, v)} />
                  </View>
                </View>
                <View style={[styles.actions, { borderTopColor: theme.colors.outlineVariant }]}>
                  <Button
                    mode="text"
                    compact
                    icon={() => <Ionicons name="trash-outline" size={16} color={theme.colors.error} />}
                    onPress={() => handleDelete(rule.id, rule.title)}
                    textColor={theme.colors.error}
                  >
                    Delete
                  </Button>
                </View>
              </GlassCard>
            </TouchableRipple>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerTextCol: { alignItems: 'center' },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
  card: { padding: spacing.base },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  contentCol: { flex: 1, marginRight: spacing.sm },
  trailingCol: { alignItems: 'flex-end', gap: spacing.xs },
  actions: {
    flexDirection: 'row',
    marginTop: spacing.base,
    paddingTop: spacing.base,
    borderTopWidth: 1,
  },
});
