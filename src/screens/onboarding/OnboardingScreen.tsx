import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import {
  Text,
  TextInput,
  Button,
  IconButton,
  Card,
  useTheme,
} from 'react-native-paper';
import { useAppStore, type OnboardingGoal } from '../../store';
import { requestNotificationPermissions } from '../../services/notificationService';
import { syncAllNotifications } from '../../services/notificationSyncService';
import {
  requestSmsPermissions,
  enableBackgroundReceiver,
  isIgnoringBatteryOptimizations,
  requestIgnoreBatteryOptimizations,
} from '../../../modules/lifeos-sms';
import { useSQLiteContext } from 'expo-sqlite';
import { generateId, nowIso } from '../../database';
import { HeroSurface } from '../../components/common/HeroSurface';
import { InlineBanner } from '../../components/common/InlineBanner';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, borderRadius, motion } from '../../theme';

const TOTAL_STEPS = 7;

const STEP_SUBTITLES: Record<number, string> = {
  1: 'A calm setup to personalize your planning and finance workspace.',
  2: 'Understand the core pillars that shape your daily flow.',
  3: 'Tell us your name and what you want to focus on.',
  4: 'Allow notifications so timers and reminders always reach you.',
  5: 'Allow SMS access so M-Pesa imports and Fuliza tracking work automatically.',
  6: 'Allow background capture so M-Pesa messages are imported even when the app is closed.',
  7: 'Final checks before launching into your dashboard.',
};

const GOALS: Array<{ key: OnboardingGoal; title: string; description: string; icon: keyof typeof Ionicons.glyphMap }> = [
  { key: 'productivity', title: 'Optimize Productivity', description: 'Sharper focus, smarter routines, better execution.', icon: 'rocket-outline' },
  { key: 'finance', title: 'Strengthen Finance', description: 'Track spending and budgets with clear control.', icon: 'pie-chart-outline' },
  { key: 'balanced', title: 'Balance Everything', description: 'Plan work, money, and time in one calm system.', icon: 'options-outline' },
];

export function OnboardingScreen() {
  const theme = useTheme();
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
  const settings = useAppStore((state) => state.settings);

  const [fullName, setFullName] = useState(profile?.name ?? '');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notificationsAllowed, setNotificationsAllowed] = useState(false);
  const [smsAllowed, setSmsAllowed] = useState(false);
  const [smsChecked, setSmsChecked] = useState(false);
  const [backgroundReceiverEnabled, setBackgroundReceiverEnabled] = useState(settings.smsBackgroundReceiver ?? false);

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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <View style={styles.inner}>
        <ScrollView style={styles.scrollArea} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          <HeroSurface
            eyebrow={`Step ${onboardingStep} of ${TOTAL_STEPS}`}
            title="PersonalOS setup"
            subtitle={STEP_SUBTITLES[onboardingStep]}
            leading={
              onboardingStep > 1 ? (
                <IconButton
                  icon={() => <Ionicons name="arrow-back" size={22} color={theme.colors.primary} />}
                  onPress={goBack}
                  size={20}
                />
              ) : null
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
            <GlassCard variant="default">
              {(() => {
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
                  case 6:
                    return (
                      <BackgroundReceiverStep
                        enabled={backgroundReceiverEnabled}
                        onEnable={async () => {
                          try {
                            await enableBackgroundReceiver(true);
                            updateSettings({ smsBackgroundReceiver: true });
                            setBackgroundReceiverEnabled(true);
                            const exempt = await isIgnoringBatteryOptimizations();
                            if (!exempt) {
                              await requestIgnoreBatteryOptimizations();
                            }
                          } catch {
                            updateSettings({ smsBackgroundReceiver: true });
                            setBackgroundReceiverEnabled(true);
                          }
                        }}
                        onSkip={() => {
                          updateSettings({ smsBackgroundReceiver: false });
                          setBackgroundReceiverEnabled(false);
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

        <Button
          mode="contained"
          onPress={handleContinue}
          loading={isSaving}
          disabled={isSaving}
          style={styles.ctaButton}
        >
          {ctaLabel}
        </Button>

        <View style={styles.dotsRow}>
          {Array.from({ length: TOTAL_STEPS }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                { backgroundColor: index < onboardingStep ? theme.colors.primary : theme.colors.outlineVariant },
              ]}
            />
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

function FeatureRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  const theme = useTheme();
  return (
    <View style={styles.featureRow}>
      <Ionicons name={icon} size={18} color={theme.colors.primary} />
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        {label}
      </Text>
    </View>
  );
}

function WelcomeStep() {
  const theme = useTheme();
  return (
    <View style={styles.stepCol}>
      <View
        style={[
          styles.logoBox,
          { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant },
        ]}
      >
        <Image source={require('../../../assets/icon.png')} style={styles.logoImage} resizeMode="contain" />
      </View>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        Welcome to your PersonalOS
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Your sanctuary for productivity, finance, and mindful planning.
      </Text>
      <View style={[styles.divider, { backgroundColor: theme.colors.outlineVariant }]} />
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
  const theme = useTheme();
  return (
    <Card style={[styles.pillarCard, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
      <Card.Content style={styles.pillarContent}>
        <Ionicons name={icon} size={20} color={theme.colors.primary} />
        <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
          {title}
        </Text>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
          {description}
        </Text>
      </Card.Content>
    </Card>
  );
}

function PillarsStep() {
  return (
    <View style={styles.stepCol}>
      <Text variant="titleLarge" style={{ color: useTheme().colors.onSurface }}>
        One place for everything.
      </Text>
      <Text variant="bodyMedium" style={{ color: useTheme().colors.onSurfaceVariant }}>
        PersonalOS keeps your planning and money flows aligned in one calm surface.
      </Text>
      <PillarCard icon="speedometer-outline" title="Productivity" description="Prioritize what matters and keep focused execution daily." />
      <PillarCard icon="calendar-outline" title="Planning & Calendar" description="Events, reminders, birthdays, and countdowns — all in one view." />
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
  const theme = useTheme();
  return (
    <View style={styles.stepCol}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        Tell us about yourself.
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        This helps personalize your workspace.
      </Text>

      <TextInput
        mode="outlined"
        dense
        label="Your name"
        value={fullName}
        onChangeText={onNameChange}
        left={
          <TextInput.Icon
            icon={({ color }) => <Ionicons name="person-outline" size={18} color={color} />}
          />
        }
        autoCapitalize="words"
      />

      <View style={styles.fieldGroup}>
        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
          Your primary focus
        </Text>
        {GOALS.map((goal) => {
          const selected = selectedGoal === goal.key;
          return (
            <Card
              key={goal.key}
              mode="elevated"
              onPress={() => onGoalSelect(goal.key)}
              style={[
                styles.goalCard,
                {
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: selected ? theme.colors.primary : theme.colors.outlineVariant,
                },
              ]}
            >
              <Card.Content style={styles.goalContent}>
                <Ionicons name={goal.icon} size={20} color={theme.colors.primary} />
                <View style={styles.goalTextCol}>
                  <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
                    {goal.title}
                  </Text>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    {goal.description}
                  </Text>
                </View>
                {selected ? <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} /> : null}
              </Card.Content>
            </Card>
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
  const theme = useTheme();
  return (
    <View style={styles.stepCol}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        Stay up to date
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Allow notifications so task timers and reminders can reach you even when the app is in the background.
      </Text>
      <PillarCard icon="speedometer-outline" title="Uninterrupted timers" description="Task timers keep ticking even when you switch apps." />
      <PillarCard icon="shield-checkmark-outline" title="Reliable reminders" description="Notifications fire on time regardless of battery mode." />

      {allowed ? (
        <View style={styles.allowedRow}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
            Notifications allowed
          </Text>
        </View>
      ) : (
        <View style={styles.stepCol}>
          <Button mode="contained" onPress={onAllow}>
            Allow Notifications
          </Button>
          <Button mode="text" onPress={onSkip}>
            Skip for now
          </Button>
        </View>
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
  const theme = useTheme();
  return (
    <View style={styles.stepCol}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        Smart finance imports
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Allow SMS access so M-Pesa transactions and Fuliza activity can be imported automatically.
      </Text>
      <PillarCard icon="cash-outline" title="Automatic M-Pesa imports" description="Spending, income, and Fuliza draws appear without manual entry." />
      <PillarCard icon="shield-checkmark-outline" title="On-device only" description="Your messages are read and parsed locally — nothing is uploaded." />

      {allowed ? (
        <View style={styles.allowedRow}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
            SMS access allowed
          </Text>
        </View>
      ) : (
        <View style={styles.stepCol}>
          <Button mode="contained" onPress={onAllow}>
            Allow SMS Access
          </Button>
          <Button mode="text" onPress={onSkip}>
            Skip for now
          </Button>
        </View>
      )}
    </View>
  );
}

function BackgroundReceiverStep({
  enabled,
  onEnable,
  onSkip,
}: {
  enabled: boolean;
  onEnable: () => void;
  onSkip: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.stepCol}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        Capture M-Pesa in the background
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Even when the app is closed, new M-Pesa messages can be imported automatically.
      </Text>
      <PillarCard icon="radio-outline" title="Automatic imports" description="Receive money or buy airtime — the transaction appears without opening the app." />
      <PillarCard icon="battery-half-outline" title="Keep it running" description="You may need to allow unrestricted battery use so Android does not block the receiver." />

      {enabled ? (
        <View style={styles.allowedRow}>
          <Ionicons name="checkmark-circle" size={20} color={theme.colors.primary} />
          <Text variant="bodyMedium" style={{ color: theme.colors.primary }}>
            Background capture enabled
          </Text>
        </View>
      ) : (
        <View style={styles.stepCol}>
          <Button mode="contained" onPress={onEnable}>
            Enable Background Capture
          </Button>
          <Button mode="text" onPress={onSkip}>
            Skip for now
          </Button>
        </View>
      )}
    </View>
  );
}

function FinalStep() {
  const theme = useTheme();
  return (
    <View style={styles.stepCol}>
      <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
        You&apos;re all set.
      </Text>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
        Welcome to your new digital sanctuary.
      </Text>
      <PillarCard icon="sparkles-outline" title="Personalized Insights" description="Actionable summaries tuned to your real usage." />
      <PillarCard icon="speedometer-outline" title="Unified Workflow" description="Tasks, calendar, and finance in a single rhythm." />
      <PillarCard icon="shield-checkmark-outline" title="Private & Secure" description="Your data stays controlled, with transparent protection." />
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
  bannerWrap: {
    marginVertical: spacing.md,
  },
  cardWrap: {},
  stepCol: {
    gap: spacing.md,
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
  pillarCard: {
    borderRadius: borderRadius.lg,
  },
  pillarContent: {
    gap: spacing.xs,
  },
  fieldGroup: {
    gap: spacing.sm,
  },
  goalCard: {
    borderWidth: 1.5,
    borderRadius: borderRadius.lg,
  },
  goalContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  goalTextCol: {
    flex: 1,
    gap: spacing.xs,
  },
  allowedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    justifyContent: 'center',
  },
  ctaButton: {
    marginTop: spacing.lg,
    borderRadius: borderRadius.full,
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
