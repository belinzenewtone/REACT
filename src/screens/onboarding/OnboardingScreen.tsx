import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore, type OnboardingGoal } from '../../store';
import { requestNotificationPermissions } from '../../services/notificationService';
import { syncAllNotifications } from '../../services/notificationSyncService';
import { requestSmsPermissions, checkPermissions } from '../../../modules/lifeos-sms';
import { useSQLiteContext } from 'expo-sqlite';
import { generateId, nowIso } from '../../database';
import { HeroSurface } from '../../components/common/HeroSurface';
import { InlineBanner } from '../../components/common/InlineBanner';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, typography, borderRadius, motion } from '../../theme';

const TOTAL_STEPS = 6;

const STEP_SUBTITLES: Record<number, string> = {
  1: 'A calm setup to personalize your planning and finance workspace.',
  2: 'Understand the core pillars that shape your daily flow.',
  3: 'Tell us your name and what you want to focus on.',
  4: 'Allow notifications so timers and reminders always reach you.',
  5: 'Allow SMS access so M-Pesa imports and Fuliza tracking work automatically.',
  6: 'Final checks before launching into your dashboard.',
};

const GOALS: Array<{ key: OnboardingGoal; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'productivity', title: 'Optimize Productivity', description: 'Sharper focus, smarter routines, better execution.', icon: 'rocket-outline' },
  { key: 'finance', title: 'Strengthen Finance', description: 'Track spending and budgets with clear control.', icon: 'pie-chart-outline' },
  { key: 'balanced', title: 'Balance Everything', description: 'Plan work, money, and time in one calm system.', icon: 'options-outline' },
];

export function OnboardingScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);
  const onboardingStep = useAppStore((state) => state.onboardingStep);
  const setOnboardingStep = useAppStore((state) => state.setOnboardingStep);
  const onboardingGoal = useAppStore((state) => state.onboardingGoal);
  const setOnboardingGoal = useAppStore((state) => state.setOnboardingGoal);
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const updateProfile = useAppStore((state) => state.updateProfile);
  const updateSettings = useAppStore((state) => state.updateSettings);

  const [fullName, setFullName] = useState(profile?.name ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [smsAllowed, setSmsAllowed] = useState(false);
  const [smsChecked, setSmsChecked] = useState(false);

  const stepFade = useRef(new Animated.Value(1)).current;
  const stepSlide = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    stepFade.setValue(0);
    stepSlide.setValue(8);
    Animated.parallel([
      Animated.timing(stepFade, { toValue: 1, duration: motion.standard, useNativeDriver: true }),
      Animated.timing(stepSlide, { toValue: 0, duration: motion.standard, useNativeDriver: true }),
    ]).start();
  }, [onboardingStep, stepFade, stepSlide]);

  const goBack = () => {
    if (onboardingStep <= 1) return;
    setErrorMessage(null);
    setOnboardingStep(onboardingStep - 1);
  };

  const complete = () => {
    if (!fullName.trim()) {
      setErrorMessage('Please provide your full name before finishing.');
      return;
    }
    setIsSaving(true);
    const timestamp = nowIso();
    if (profile) {
      updateProfile({ name: fullName.trim() });
    } else {
      setProfile({
        id: generateId(),
        name: fullName.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
    setIsSaving(false);
    setOnboardingStep(TOTAL_STEPS);
    setHasCompletedOnboarding(true);
  };

  const handleContinue = () => {
    if (onboardingStep === 3 && !fullName.trim()) {
      setErrorMessage('Please provide your full name to continue.');
      return;
    }
    setErrorMessage(null);
    if (onboardingStep >= TOTAL_STEPS) {
      complete();
      return;
    }
    setOnboardingStep(onboardingStep + 1);
  };

  const ctaLabel = onboardingStep === 1 ? "Let's Begin" : onboardingStep === TOTAL_STEPS ? 'Start My Journey' : 'Continue';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <HeroSurface
            eyebrow={`Step ${onboardingStep} of ${TOTAL_STEPS}`}
            title="PersonalOS setup"
            subtitle={STEP_SUBTITLES[onboardingStep]}
            leading={
              onboardingStep > 1 ? (
                <TouchableOpacity onPress={goBack} style={styles.backButton}>
                  <Ionicons name="arrow-back" size={22} color={colors.accentPrimary} />
                </TouchableOpacity>
              ) : (
                <View style={styles.backButton} />
              )
            }
          />

          {errorMessage ? (
            <View style={styles.bannerWrap}>
              <InlineBanner tone="warning" title={errorMessage} icon="alert-circle-outline" />
            </View>
          ) : null}

          <Animated.View
            style={[
              styles.cardWrap,
              { opacity: stepFade, transform: [{ translateY: stepSlide }] },
            ]}
          >
            <GlassCard variant="elevated">
              {(() => {
                // Guard against any out-of-range step value showing a blank card
                // (e.g. transient state during `setOnboardingStep` + `setHasCompletedOnboarding`).
                // Clamp into the [1..TOTAL_STEPS] range and render exactly one step.
                const step = Math.min(Math.max(onboardingStep, 1), TOTAL_STEPS);
                switch (step) {
                  case 1:
                    return <WelcomeStep />;
                  case 2:
                    return <PillarsStep />;
                  case 3:
                    return (
                      <ProfileSetupStep
                        fullName={fullName}
                        onNameChange={(value) => {
                          setFullName(value);
                          setErrorMessage(null);
                        }}
                        selectedGoal={onboardingGoal}
                        onGoalSelect={setOnboardingGoal}
                      />
                    );
                  case 4:
                    return (
                      <PermissionStep
                        allowed={notificationsAllowed}
                        onAllow={async () => {
                          const granted = await requestNotificationPermissions();
                          updateSettings({ notificationsEnabled: granted });
                          setNotificationsAllowed(granted);
                          if (granted) {
                            await syncAllNotifications(db);
                          }
                        }}
                        onSkip={() => {
                          updateSettings({ notificationsEnabled: false });
                          setNotificationsAllowed(false);
                        }}
                      />
                    );
                  case 5:
                    return (
                      <SmsPermissionStep
                        allowed={smsAllowed}
                        onAllow={async () => {
                          const { granted } = await requestSmsPermissions();
                          setSmsAllowed(granted);
                          setSmsChecked(true);
                        }}
                        onSkip={() => {
                          setSmsAllowed(false);
                          setSmsChecked(true);
                        }}
                      />
                    );
                  case TOTAL_STEPS:
                  default:
                    return <FinalStep />;
                }
              })()}
            </GlassCard>
        </Animated.View>
        </ScrollView>

        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: colors.accentPrimary }]}
          onPress={handleContinue}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator color={colors.textInverse} />
          ) : (
            <Text style={[styles.ctaText, { color: colors.textInverse }]}>{ctaLabel}</Text>
          )}
        </TouchableOpacity>

        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index < onboardingStep ? colors.accentPrimary : colors.border },
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const colors = useThemeColors();
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={colors.accentPrimary} />
      <Text style={[styles.featureLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function WelcomeStep() {
  const colors = useThemeColors();
  return (
    <View style={styles.stepCol}>
      <View style={[styles.logoBox, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}>
        <Image source={require('../../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
      </View>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Welcome to your PersonalOS</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Your sanctuary for productivity, finance, and mindful planning.
      </Text>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
      <FeatureRow icon="speedometer-outline" label="Productivity — tasks, routines, and focused planning" />
      <FeatureRow icon="pie-chart-outline" label="Finance — budgets, spending, and trends at a glance" />
      <FeatureRow icon="calendar-outline" label="Calendar — events, birthdays, and smart reminders" />
    </View>
  );
}

function PillarCard({
  icon,
  title,
  description,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}) {
  const colors = useThemeColors();
  return (
    <View style={[styles.pillarCard, { backgroundColor: colors.glassWhite, borderColor: colors.border }]}>
      <Ionicons name={icon} size={20} color={colors.accentPrimary} />
      <Text style={[styles.pillarTitle, { color: colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.pillarDescription, { color: colors.textSecondary }]}>{description}</Text>
    </View>
  );
}

function PillarsStep() {
  const colors = useThemeColors();
  return (
    <View style={styles.stepCol}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>One place for everything.</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        PersonalOS keeps your planning and money flows aligned in one calm surface.
      </Text>
      <PillarCard icon="speedometer-outline" title="Productivity" description="Prioritize what matters and keep focused execution daily." />
      <PillarCard icon="calendar-outline" title="Planning &amp; Calendar" description="Events, reminders, birthdays, and countdowns — all in one view." />
      <PillarCard icon="pie-chart-outline" title="Finance" description="Track spending, watch budgets, and review trends with confidence." />
    </View>
  );
}

function ProfileSetupStep({
  fullName,
  onNameChange,
  selectedGoal,
  onGoalSelect,
}: {
  fullName: string;
  onNameChange: (value: string) => void;
  selectedGoal: OnboardingGoal;
  onGoalSelect: (goal: OnboardingGoal) => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.stepCol}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Tell us about yourself.</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>This helps personalize your workspace.</Text>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Your name</Text>
        <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.bgTertiary }]}>
          <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
          <TextInput
            style={[styles.input, { color: colors.textPrimary }]}
            value={fullName}
            onChangeText={onNameChange}
            placeholder="Full name"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="words"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>Your primary focus</Text>
        {GOALS.map((goal) => {
          const selected = selectedGoal === goal.key;
          return (
            <TouchableOpacity
              key={goal.key}
              activeOpacity={0.8}
              onPress={() => onGoalSelect(goal.key)}
              style={[
                styles.goalCard,
                {
                  borderColor: selected ? colors.accentPrimary : colors.border,
                  borderWidth: selected ? 1.5 : 1,
                  backgroundColor: selected ? `${colors.accentPrimary}12` : colors.bgTertiary,
                },
              ]}
            >
              <Ionicons name={goal.icon} size={20} color={colors.accentPrimary} />
              <View style={styles.goalTextCol}>
                <Text style={[styles.pillarTitle, { color: colors.textPrimary }]}>{goal.title}</Text>
                <Text style={[styles.pillarDescription, { color: colors.textSecondary }]}>{goal.description}</Text>
              </View>
              {selected ? <Ionicons name="checkmark-circle" size={20} color={colors.accentPrimary} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

function PermissionStep({
  allowed,
  onAllow,
  onSkip,
}: {
  allowed: boolean;
  onAllow: () => void;
  onSkip: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.stepCol}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Stay up to date</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Allow notifications so task timers and reminders can reach you even when the app is in the background.
      </Text>
      <PillarCard icon="speedometer-outline" title="Uninterrupted timers" description="Task timers keep ticking even when you switch apps." />
      <PillarCard icon="shield-checkmark-outline" title="Reliable reminders" description="Notifications fire on time regardless of battery mode." />

      {allowed ? (
        <View style={styles.allowedRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.accentPrimary} />
          <Text style={[styles.allowedText, { color: colors.accentPrimary }]}>Notifications allowed</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity style={[styles.allowButton, { backgroundColor: colors.accentPrimary }]} onPress={onAllow}>
            <Text style={[styles.allowButtonText, { color: colors.textInverse }]}>Allow Notifications</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function SmsPermissionStep({
  allowed,
  onAllow,
  onSkip,
}: {
  allowed: boolean;
  onAllow: () => void;
  onSkip: () => void;
}) {
  const colors = useThemeColors();
  return (
    <View style={styles.stepCol}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>Smart finance imports</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>
        Allow SMS access so M-Pesa transactions and Fuliza activity can be imported automatically.
      </Text>
      <PillarCard icon="cash-outline" title="Automatic M-Pesa imports" description="Spending, income, and Fuliza draws appear without manual entry." />
      <PillarCard icon="shield-checkmark-outline" title="On-device only" description="Your messages are read and parsed locally — nothing is uploaded." />

      {allowed ? (
        <View style={styles.allowedRow}>
          <Ionicons name="checkmark-circle" size={20} color={colors.accentPrimary} />
          <Text style={[styles.allowedText, { color: colors.accentPrimary }]}>SMS access allowed</Text>
        </View>
      ) : (
        <>
          <TouchableOpacity style={[styles.allowButton, { backgroundColor: colors.accentPrimary }]} onPress={onAllow}>
            <Text style={[styles.allowButtonText, { color: colors.textInverse }]}>Allow SMS Access</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={onSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: colors.textSecondary }]}>Skip for now</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

function FinalStep() {
  const colors = useThemeColors();
  return (
    <View style={styles.stepCol}>
      <Text style={[styles.stepTitle, { color: colors.textPrimary }]}>You&apos;re all set.</Text>
      <Text style={[styles.stepSubtitle, { color: colors.textSecondary }]}>Welcome to your new digital sanctuary.</Text>
      <PillarCard icon="sparkles-outline" title="Personalized Insights" description="Actionable summaries tuned to your real usage." />
      <PillarCard icon="speedometer-outline" title="Unified Workflow" description="Tasks, calendar, and finance in a single rhythm." />
      <PillarCard icon="shield-checkmark-outline" title="Private &amp; Secure" description="Your data stays controlled, with transparent protection." />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.screenHorizontal,
    paddingTop: spacing.sm,
  },
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.lg,
  },
  backButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
  },
  bannerWrap: {
    marginVertical: spacing.md,
  },
  cardWrap: {
  },
  stepCol: {
    gap: spacing.md,
  },
  stepTitle: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    lineHeight: typography.sizes['2xl'] * 1.3,
  },
  stepSubtitle: {
    fontSize: typography.sizes.base,
    lineHeight: typography.sizes.base * 1.5,
  },
  logoBox: {
    width: 80,
    height: 80,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  logoImage: {
    width: 48,
    height: 48,
  },
  divider: {
    height: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  featureLabel: {
    fontSize: typography.sizes.sm,
    flex: 1,
    lineHeight: typography.sizes.sm * 1.5,
  },
  pillarCard: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  pillarTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  pillarDescription: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.full,
    paddingHorizontal: spacing.base,
    height: 48,
  },
  input: {
    flex: 1,
    marginLeft: spacing.sm,
    fontSize: typography.sizes.base,
  },
  goalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  goalTextCol: {
    flex: 1,
    gap: spacing.xs,
  },
  allowButton: {
    borderRadius: borderRadius.full,
    paddingVertical: spacing.base,
    alignItems: 'center',
  },
  allowButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  skipText: {
    fontSize: typography.sizes.sm,
  },
  allowedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  allowedText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  ctaButton: {
    marginTop: spacing.lg,
    height: 52,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  dot: {
    width: 28,
    height: 4,
    borderRadius: borderRadius.full,
  },
});
