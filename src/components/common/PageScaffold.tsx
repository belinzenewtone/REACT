import React, { type ReactNode } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  type ViewStyle,
  type RefreshControlProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Appbar, Text, useTheme } from 'react-native-paper';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

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
  const theme = useTheme();

  const content = (
    <>
      {topBanner}
      {children}
    </>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <Appbar.Header
        style={[
          styles.header,
          { backgroundColor: theme.colors.background },
        ]}
        statusBarHeight={0}
      >
        {onBack ? (
          <Appbar.BackAction
            onPress={onBack}
            color={theme.colors.onSurface}
            size={20}
          />
        ) : (
          <View style={styles.backPlaceholder} />
        )}
        <View style={styles.headerText}>
          {eyebrow ? (
            <Text variant="labelSmall" style={{ color: theme.colors.primary }} numberOfLines={1}>
              {eyebrow.toUpperCase()}
            </Text>
          ) : null}
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
        <View style={styles.actions}>{actions}</View>
      </Appbar.Header>

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
    elevation: 0,
    shadowOpacity: 0,
    paddingHorizontal: spacing.screenHorizontal - 4,
    height: 52,
    minHeight: 52,
  },
  backPlaceholder: {
    width: 36,
    height: 36,
  },
  headerText: {
    flex: 1,
    alignItems: 'center',
  },
  actions: {
    minWidth: 36,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    gap: spacing.xs,
  },
  contentPadding: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
  },
});
