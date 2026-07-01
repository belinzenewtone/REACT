import React, { type ReactNode } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography } from '../../theme';

interface PageScaffoldProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  onBack?: () => void;
  actions?: ReactNode;
  topBanner?: ReactNode;
  scrollable?: boolean;
  contentPadding?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  contentStyle?: ViewStyle;
  children: ReactNode;
}

export function PageScaffold({
  eyebrow,
  title,
  subtitle,
  onBack,
  actions,
  topBanner,
  scrollable = true,
  contentPadding = true,
  refreshControl,
  contentStyle,
  children,
}: PageScaffoldProps) {
  const colors = useThemeColors();

  const content = (
    <>
      {topBanner}
      {children}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <View style={styles.header}>
        {onBack ? (
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}
        <View style={styles.headerText}>
          {eyebrow ? (
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{eyebrow}</Text>
          ) : null}
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          {subtitle ? (
            <Text style={[styles.subtitle, { color: colors.textTertiary }]} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>{actions}</View>
      </View>

      {scrollable ? (
        <ScrollView
          contentContainerStyle={[contentPadding && styles.contentPadding, contentStyle]}
          refreshControl={refreshControl}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={[styles.flex, contentPadding && styles.contentPadding, contentStyle]}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.base,
  },
  backButton: {
    width: 32,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  eyebrow: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
    marginTop: 2,
  },
  subtitle: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
    textAlign: 'center',
  },
  actions: {
    minWidth: 32,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.sm,
  },
  contentPadding: {
    padding: spacing.lg,
    paddingTop: spacing.sm,
  },
});
