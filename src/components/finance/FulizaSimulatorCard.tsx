import React, { useMemo, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder, LayoutChangeEvent } from 'react-native';
import { Text, useTheme, IconButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { spacing, borderRadius } from '../../theme';
import { projectFuliza, formatKes } from '../../utils/fulizaProjection';

export interface FulizaSimulatorCardProps {
  /** Original draw amount in KES. */
  principalKes: number;
  /** Amount already repaid. */
  totalRepaidKes: number;
  /** ISO date string of the draw (e.g. "2026-07-10"). */
  drawDateIso: string;
  /** ISO date string to project from (defaults to today when omitted). */
  asOfDateIso?: string;
}

const MIN_DAILY = 10;
const MAX_DAILY = 5_000;

/**
 * Interactive card showing Fuliza loan cost and payoff projection (S5).
 *
 * Displays:
 *  - Current outstanding balance with progress bar (repaid vs total).
 *  - Daily fee and access fee breakdown.
 *  - Slider to adjust assumed daily repayment amount.
 *  - Estimated payoff date and days remaining at the chosen repayment rate.
 *
 * All computation is done in `projectFuliza()` — this component only presents
 * the result and handles the slider interaction.
 */
export function FulizaSimulatorCard({
  principalKes,
  totalRepaidKes,
  drawDateIso,
  asOfDateIso,
}: FulizaSimulatorCardProps) {
  const theme = useTheme();

  const [dailyRepayment, setDailyRepayment] = useState(() =>
    // Default slider to 2× the daily fee so the user immediately sees a
    // realistic projection rather than the loan growing indefinitely.
    Math.min(Math.max(MIN_DAILY * 2, Math.ceil(principalKes / 30)), MAX_DAILY),
  );

  const projection = useMemo(
    () => projectFuliza(principalKes, totalRepaidKes, drawDateIso, asOfDateIso, dailyRepayment),
    [principalKes, totalRepaidKes, drawDateIso, asOfDateIso, dailyRepayment],
  );

  const repaidFraction = principalKes > 0 ? Math.min(1, totalRepaidKes / (principalKes + projection.totalInterestKes)) : 0;

  const accentColor = projection.totalOwedKes === 0 ? theme.colors.primary : theme.colors.error;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${accentColor}20` }]}>
          <Ionicons name="trending-up-outline" size={20} color={accentColor} />
        </View>
        <View style={styles.headerText}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            FULIZA SIMULATOR
          </Text>
          <Text variant="titleMedium" style={{ color: accentColor }}>
            {formatKes(projection.totalOwedKes)} owed
          </Text>
        </View>
        <View style={styles.daysChip}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Day {projection.daysElapsed}
          </Text>
        </View>
      </View>

      {/* Repayment progress bar */}
      <View style={styles.progressSection}>
        <View style={[styles.progressTrack, { backgroundColor: `${accentColor}20` }]}>
          <View
            style={[styles.progressFill, { width: `${Math.round(repaidFraction * 100)}%`, backgroundColor: theme.colors.primary }]}
          />
        </View>
        <View style={styles.progressLabels}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            Repaid {formatKes(totalRepaidKes)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {Math.round(repaidFraction * 100)}%
          </Text>
        </View>
      </View>

      {/* Fee breakdown */}
      <View style={[styles.feeRow, { borderColor: theme.colors.outlineVariant }]}>
        <FeeCell label="Access fee" value={formatKes(projection.accessFeeKes)} theme={theme} />
        <View style={[styles.feeDivider, { backgroundColor: theme.colors.outlineVariant }]} />
        <FeeCell label="Daily fee" value={`${formatKes(projection.dailyFeeKes)}/day`} theme={theme} />
        <View style={[styles.feeDivider, { backgroundColor: theme.colors.outlineVariant }]} />
        <FeeCell label="Interest so far" value={formatKes(projection.totalInterestKes)} theme={theme} />
      </View>

      {/* Repayment rate control */}
      <View style={styles.sliderSection}>
        <View style={styles.sliderHeader}>
          <Text variant="labelMedium" style={{ color: theme.colors.onSurface }}>
            Daily repayment
          </Text>
          <Text variant="labelMedium" style={{ color: theme.colors.primary, fontVariant: ['tabular-nums'] }}>
            {formatKes(dailyRepayment)}
          </Text>
        </View>
        <RepaymentSlider
          value={dailyRepayment}
          min={MIN_DAILY}
          max={MAX_DAILY}
          step={50}
          accentColor={theme.colors.primary}
          trackColor={`${theme.colors.primary}30`}
          onChange={setDailyRepayment}
        />
        <View style={styles.sliderRange}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatKes(MIN_DAILY)}
          </Text>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {formatKes(MAX_DAILY)}
          </Text>
        </View>
        <View style={styles.stepButtons}>
          <IconButton
            icon="minus"
            size={16}
            onPress={() => setDailyRepayment((v) => Math.max(MIN_DAILY, v - 50))}
            disabled={dailyRepayment <= MIN_DAILY}
            style={styles.stepBtn}
          />
          <IconButton
            icon="plus"
            size={16}
            onPress={() => setDailyRepayment((v) => Math.min(MAX_DAILY, v + 50))}
            disabled={dailyRepayment >= MAX_DAILY}
            style={styles.stepBtn}
          />
        </View>
      </View>

      {/* Payoff estimate */}
      {projection.estimatedDaysToPayoff !== null ? (
        <View style={[styles.payoffBanner, { backgroundColor: `${theme.colors.primary}15`, borderColor: `${theme.colors.primary}30` }]}>
          <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.primary} />
          <Text variant="labelMedium" style={{ color: theme.colors.primary, flex: 1 }}>
            Paid off in {projection.estimatedDaysToPayoff} day{projection.estimatedDaysToPayoff !== 1 ? 's' : ''} · {projection.estimatedPayoffDate}
          </Text>
        </View>
      ) : (
        <View style={[styles.payoffBanner, { backgroundColor: `${accentColor}10`, borderColor: `${accentColor}25` }]}>
          <Ionicons name="alert-circle-outline" size={16} color={accentColor} />
          <Text variant="labelMedium" style={{ color: accentColor, flex: 1 }}>
            {dailyRepayment <= projection.dailyFeeKes
              ? 'Repayment below daily fee — loan grows indefinitely'
              : 'Increase daily repayment to see payoff estimate'}
          </Text>
        </View>
      )}
    </View>
  );
}

function RepaymentSlider({
  value,
  min,
  max,
  step,
  accentColor,
  trackColor,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  step: number;
  accentColor: string;
  trackColor: string;
  onChange: (v: number) => void;
}) {
  const trackWidth = useRef(0);
  const fraction = (value - min) / (max - min);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        if (!trackWidth.current) return;
        const x = evt.nativeEvent.locationX;
        const raw = min + (x / trackWidth.current) * (max - min);
        const stepped = Math.round(raw / step) * step;
        onChange(Math.min(max, Math.max(min, stepped)));
      },
      onPanResponderMove: (_, gs) => {
        if (!trackWidth.current) return;
        const x = gs.moveX;
        const raw = min + (x / trackWidth.current) * (max - min);
        const stepped = Math.round(raw / step) * step;
        onChange(Math.min(max, Math.max(min, stepped)));
      },
    }),
  ).current;

  const handleLayout = (e: LayoutChangeEvent) => {
    trackWidth.current = e.nativeEvent.layout.width;
  };

  return (
    <View
      style={[sliderStyles.track, { backgroundColor: trackColor }]}
      onLayout={handleLayout}
      {...panResponder.panHandlers}
    >
      <View style={[sliderStyles.fill, { width: `${fraction * 100}%`, backgroundColor: accentColor }]} />
      <View style={[sliderStyles.thumb, { left: `${fraction * 100}%`, backgroundColor: accentColor }]} />
    </View>
  );
}

const sliderStyles = StyleSheet.create({
  track: {
    height: 6,
    borderRadius: 3,
    position: 'relative',
    marginVertical: 10,
  },
  fill: {
    position: 'absolute',
    height: '100%',
    borderRadius: 3,
    top: 0,
    left: 0,
  },
  thumb: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    top: -7,
    marginLeft: -10,
  },
});

function FeeCell({
  label,
  value,
  theme,
}: {
  label: string;
  value: string;
  theme: ReturnType<typeof useTheme>;
}) {
  return (
    <View style={styles.feeCell}>
      <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
        {label}
      </Text>
      <Text variant="labelMedium" style={{ color: theme.colors.onSurface, fontVariant: ['tabular-nums'] }} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  daysChip: {
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  progressSection: {
    gap: 4,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    minWidth: 6,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  feeRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  feeCell: {
    flex: 1,
    padding: spacing.xs,
    gap: 2,
  },
  feeDivider: {
    width: 1,
  },
  sliderSection: {
    gap: 4,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sliderRange: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
    marginTop: -spacing.xs,
  },
  stepBtn: {
    margin: 0,
  },
  payoffBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
});
