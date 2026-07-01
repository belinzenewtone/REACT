import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { generateId, nowIso } from '../../database';
import { HeroSurface } from '../../components/common/HeroSurface';
import { TopBanner } from '../../components/common/TopBanner';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, typography, borderRadius } from '../../theme';

export function AuthScreen() {
  const colors = useThemeColors();
  const setIsAuthenticated = useAppStore((state) => state.setIsAuthenticated);
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);

  const [fullName, setFullName] = useState(profile?.name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [isLoading, setIsLoading] = useState(false);
  const [snackbar, setSnackbar] = useState<string | null>(null);

  const handleSignUp = () => {
    const trimmedName = fullName.trim();
    if (!trimmedName) {
      setSnackbar('Please enter your full name to continue.');
      return;
    }
    setIsLoading(true);
    const timestamp = nowIso();
    setProfile({
      id: profile?.id ?? generateId(),
      name: trimmedName,
      username: username.trim() || undefined,
      email: profile?.email,
      phone: profile?.phone,
      avatarUri: profile?.avatarUri,
      createdAt: profile?.createdAt ?? timestamp,
      updatedAt: timestamp,
    });
    setIsLoading(false);
    setIsAuthenticated(true);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.loadingContent}>
          <Image source={require('../../../assets/icon.png')} style={styles.loadingLogo} resizeMode="contain" />
          <ActivityIndicator color={colors.accentPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <HeroSurface
          eyebrow="Welcome"
          title="Your PersonalOS"
          subtitle="All your tasks, calendar, and finances — stored locally on your device."
          action={
            <View style={[styles.logoBadge, { backgroundColor: colors.bgTertiary, borderColor: colors.border }]}>
              <Image source={require('../../../assets/icon.png')} style={styles.logoBadgeImage} resizeMode="contain" />
            </View>
          }
        />

        <GlassCard variant="elevated" style={styles.card}>
          <FieldLabel label="Full Name" />
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.bgTertiary }]}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={fullName}
              onChangeText={setFullName}
              placeholder="Your full name"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="words"
            />
          </View>

          <FieldLabel label="Username (optional)" />
          <View style={[styles.inputWrap, { borderColor: colors.border, backgroundColor: colors.bgTertiary }]}>
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <TextInput
              style={[styles.input, { color: colors.textPrimary }]}
              value={username}
              onChangeText={setUsername}
              placeholder="Pick a username"
              placeholderTextColor={colors.textTertiary}
              autoCapitalize="none"
            />
          </View>

          <TouchableOpacity style={[styles.ctaButton, { backgroundColor: colors.accentPrimary }]} onPress={handleSignUp}>
            <Text style={[styles.ctaText, { color: colors.textInverse }]}>Get Started</Text>
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.textSecondary }]}>
            No account required. Your data stays on this device.
          </Text>
        </GlassCard>
      </ScrollView>

      <View style={styles.snackbarWrap}>
        <TopBanner
          tone="info"
          message={snackbar ?? ''}
          visible={!!snackbar}
          onDismiss={() => setSnackbar(null)}
          autoDismissMs={3000}
        />
      </View>
    </SafeAreaView>
  );
}

function FieldLabel({ label }: { label: string }) {
  const colors = useThemeColors();
  return <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>{label}</Text>;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
    paddingBottom: spacing['2xl'],
  },
  loadingContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: spacing.base,
  },
  loadingLogo: {
    width: 88,
    height: 88,
    borderRadius: borderRadius.lg,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeImage: {
    width: 24,
    height: 24,
  },
  card: {
    marginTop: spacing.lg,
    gap: spacing.sm,
  },
  fieldLabel: {
    fontSize: typography.sizes.xs,
    fontWeight: typography.weights.medium,
    marginTop: spacing.sm,
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
  ctaButton: {
    marginTop: spacing.base,
    height: 54,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ctaText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  disclaimer: {
    fontSize: typography.sizes.xs,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  snackbarWrap: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
  },
});
