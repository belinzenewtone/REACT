import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Text, useTheme } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { PageScaffold } from '../../components/common/PageScaffold';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';

const HUB_SECTIONS = [
  { icon: 'wallet-outline', label: 'Budgets', color: '#34D399', screen: 'Budgets' },
  { icon: 'cash-outline', label: 'Income', color: '#4DB8FF', screen: 'Income' },
  { icon: 'repeat-outline', label: 'Recurring', color: '#8B5CF6', screen: 'Recurring' },
  { icon: 'trending-down-outline', label: 'Loans & Fuliza', color: '#FF6B6B', screen: 'Loans' },
  { icon: 'receipt-outline', label: 'Bills', color: '#F59E0B', screen: 'Bills' },
  { icon: 'flag-outline', label: 'Goals', color: '#EC4899', screen: 'Goals' },
  { icon: 'search-outline', label: 'Search Finance', color: '#A78BFA', screen: 'Search' },
  { icon: 'download-outline', label: 'Export', color: '#14B8A6', screen: 'Export' },
];

export function PlannerHubScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();

  return (
    <PageScaffold title="Finance Hub" onBack={() => navigation.goBack()}>
      <View style={styles.list}>
        {HUB_SECTIONS.map((section) => (
          <GlassCard
            key={section.screen}
            style={styles.card}
            onPress={() => navigation.navigate(section.screen)}
          >
            <Card.Content style={styles.row}>
              <View style={[styles.iconCircle, { backgroundColor: `${section.color}20` }]}>
                <Ionicons
                  name={section.icon as keyof typeof Ionicons.glyphMap}
                  size={22}
                  color={section.color}
                />
              </View>
              <Text
                variant="bodyLarge"
                style={[styles.label, { color: theme.colors.onSurface }]}
                numberOfLines={1}
              >
                {section.label}
              </Text>
              <Ionicons name="chevron-forward" size={20} color={theme.colors.outline} />
            </Card.Content>
          </GlassCard>
        ))}
      </View>
    </PageScaffold>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.sm,
  },
  card: {
    borderRadius: borderRadius.lg,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.base,
    paddingVertical: spacing.sm,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  label: {
    flex: 1,
  },
});
