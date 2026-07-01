import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

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
  const colors = useThemeColors();
  const navigation = useNavigation<any>();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Finance Hub</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.list}>
          {HUB_SECTIONS.map((section, index) => (
            <TouchableOpacity
              key={section.screen}
              style={[
                styles.row,
                { backgroundColor: colors.bgElevated, borderColor: colors.border },
                index === 0 && { borderTopLeftRadius: borderRadius.xl, borderTopRightRadius: borderRadius.xl },
                index === HUB_SECTIONS.length - 1 && {
                  borderBottomLeftRadius: borderRadius.xl,
                  borderBottomRightRadius: borderRadius.xl,
                },
              ]}
              onPress={() => navigation.navigate(section.screen)}
              activeOpacity={0.7}
            >
              <View style={[styles.iconCircle, { backgroundColor: `${section.color}20` }]}>
                <Ionicons name={section.icon as keyof typeof Ionicons.glyphMap} size={22} color={section.color} />
              </View>
              <Text style={[styles.rowLabel, { color: colors.textPrimary }]}>{section.label}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
  },
  headerText: {
    alignItems: 'center',
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
    paddingTop: spacing.sm,
  },
  list: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginLeft: spacing.base,
  },
});
