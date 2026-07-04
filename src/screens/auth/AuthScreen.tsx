import React, { useState } from 'react';
import {
  View,
  Image,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Text, TextInput, Button, useTheme } from 'react-native-paper';
import { useAppStore } from '../../store';
import { generateId, nowIso } from '../../database';
import { HeroSurface } from '../../components/common/HeroSurface';
import { TopBanner } from '../../components/common/TopBanner';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, borderRadius } from '../../theme';

export function AuthScreen() {
  const theme = useTheme();
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
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContent}>
          <Image source={require('../../../assets/icon.png')} style={styles.loadingLogo} resizeMode="contain" />
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <HeroSurface
          eyebrow="Welcome"
          title="Your PersonalOS"
          subtitle="All your tasks, calendar, and finances — stored locally on your device."
          action={
            <View style={[styles.logoBadge, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
              <Image source={require('../../../assets/icon.png')} style={styles.logoBadgeImage} resizeMode="contain" />
            </View>
          }
        />

        <GlassCard variant="default" style={styles.card}>
          <TextInput
            mode="outlined"
            dense
            label="Full Name"
            value={fullName}
            onChangeText={setFullName}
            left={
              <TextInput.Icon
                icon={({ color }) => <Ionicons name="person-outline" size={18} color={color} />}
              />
            }
            autoCapitalize="words"
          />

          <TextInput
            mode="outlined"
            dense
            label="Username (optional)"
            value={username}
            onChangeText={setUsername}
            left={
              <TextInput.Icon
                icon={({ color }) => <Ionicons name="person-outline" size={18} color={color} />}
              />
            }
            autoCapitalize="none"
          />

          <Button
            mode="contained"
            onPress={handleSignUp}
            loading={isLoading}
            disabled={isLoading}
            style={styles.ctaButton}
          >
            Get Started
          </Button>

          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
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
  ctaButton: {
    marginTop: spacing.base,
    borderRadius: borderRadius.full,
  },
  snackbarWrap: {
    position: 'absolute',
    bottom: spacing.xl,
    left: 0,
    right: 0,
  },
});
