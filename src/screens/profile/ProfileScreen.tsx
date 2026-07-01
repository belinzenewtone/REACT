import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore, useProfileStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

const MENU_ITEMS = [
  { icon: 'settings-outline', label: 'Settings', action: 'settings' },
  { icon: 'help-circle-outline', label: 'Help & Support', action: 'support' },
  { icon: 'document-text-outline', label: "What's New", action: 'changelog' },
];

export function ProfileScreen() {
  const colors = useThemeColors();
  const db = useSQLiteContext();
  const navigation = useNavigation<any>();
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);
  const setHasCompletedOnboarding = useAppStore((state) => state.setHasCompletedOnboarding);
  const { stats, isLoading, loadStats } = useProfileStore();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? '');
  const [editEmail, setEditEmail] = useState(profile?.email ?? '');
  const [editPhone, setEditPhone] = useState(profile?.phone ?? '');

  useEffect(() => {
    loadStats(db);
  }, [db, loadStats]);

  const handleSaveProfile = () => {
    setProfile({
      id: profile?.id ?? 'default',
      name: editName.trim() || 'User',
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setEditVisible(false);
  };

  const initials = (profile?.name ?? 'User')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={() => loadStats(db)}
            tintColor={colors.accentPrimary}
            colors={[colors.accentPrimary]}
          />
        }
      >
        <Text style={[styles.title, { color: colors.textPrimary }]}>Profile</Text>

        <GlassCard style={styles.profileCard}>
          <View style={styles.profileHeader}>
            <View style={[styles.avatar, { backgroundColor: colors.accentPrimary }]}>
              <Text style={[styles.initials, { color: colors.textInverse }]}>{initials}</Text>
            </View>
            <View style={styles.profileInfo}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>
                {profile?.name ?? 'User'}
              </Text>
              {profile?.email ? (
                <Text style={[styles.email, { color: colors.textSecondary }]}>{profile.email}</Text>
              ) : null}
              {profile?.phone ? (
                <Text style={[styles.phone, { color: colors.textSecondary }]}>{profile.phone}</Text>
              ) : null}
            </View>
          </View>

          <TouchableOpacity
            style={[styles.editButton, { borderColor: colors.border }]}
            onPress={() => setEditVisible(true)}
          >
            <Ionicons name="create-outline" size={16} color={colors.accentPrimary} />
            <Text style={[styles.editText, { color: colors.accentPrimary }]}>Edit Profile</Text>
          </TouchableOpacity>
        </GlassCard>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account Statistics</Text>
        <View style={styles.statsGrid}>
          <StatCard label="Transactions" value={stats?.totalTransactions ?? 0} />
          <StatCard label="Total Spend" value={formatCurrency(stats?.totalSpend ?? 0)} />
          <StatCard label="Total Income" value={formatCurrency(stats?.totalIncome ?? 0)} />
          <StatCard
            label="Largest Tx"
            value={stats?.largestTransaction ? formatCurrency(stats.largestTransaction.amount) : '-'}
            subvalue={stats?.largestTransaction?.merchant}
          />
          <StatCard
            label="Most Common"
            value={stats?.mostCommonMerchant ?? '-'}
          />
          <StatCard label="Average Tx" value={formatCurrency(stats?.averageTransaction ?? 0)} />
        </View>

        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Actions</Text>
        <GlassCard>
          {MENU_ITEMS.map((item, index) => (
            <TouchableOpacity
              key={item.action}
              style={[
                styles.menuItem,
                index < MENU_ITEMS.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
              onPress={() => {
                if (item.action === 'settings') navigation.navigate('Settings');
              }}
            >
              <Ionicons name={item.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.accentPrimary} />
              <Text style={[styles.menuLabel, { color: colors.textPrimary }]}>{item.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </GlassCard>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: colors.danger + '20' }]}
          onPress={() => setHasCompletedOnboarding(false)}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Reset onboarding</Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={editVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEditVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: colors.glassBlack }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>

            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.glassWhite }]}
              placeholder="Name"
              placeholderTextColor={colors.textTertiary}
              value={editName}
              onChangeText={setEditName}
            />
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.glassWhite }]}
              placeholder="Email"
              placeholderTextColor={colors.textTertiary}
              value={editEmail}
              onChangeText={setEditEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <TextInput
              style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.glassWhite }]}
              placeholder="Phone"
              placeholderTextColor={colors.textTertiary}
              value={editPhone}
              onChangeText={setEditPhone}
              keyboardType="phone-pad"
            />

            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]}
              onPress={handleSaveProfile}
            >
              <Text style={[styles.saveText, { color: colors.textInverse }]}>Save</Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => setEditVisible(false)}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function StatCard({ label, value, subvalue }: { label: string; value: string | number; subvalue?: string }) {
  const colors = useThemeColors();

  return (
    <GlassCard style={styles.statCard}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>
        {value}
      </Text>
      {subvalue ? (
        <Text style={[styles.statSubvalue, { color: colors.textSecondary }]} numberOfLines={1}>
          {subvalue}
        </Text>
      ) : null}
      <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{label}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
  },
  title: {
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    marginBottom: spacing.lg,
  },
  profileCard: {
    marginBottom: spacing.xl,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  initials: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  profileInfo: {
    marginLeft: spacing.base,
    flex: 1,
  },
  name: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
  },
  email: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  phone: {
    fontSize: typography.sizes.sm,
    marginTop: 2,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.base,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    gap: spacing.sm,
  },
  editText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  sectionTitle: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.base,
    marginTop: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.base,
  },
  statCard: {
    flex: 1,
    minWidth: '30%',
  },
  statValue: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.bold,
  },
  statSubvalue: {
    fontSize: typography.sizes.xs,
    marginTop: 2,
  },
  statLabel: {
    fontSize: typography.sizes.xs,
    marginTop: spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.base,
    gap: spacing.base,
  },
  menuLabel: {
    flex: 1,
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xl,
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    gap: spacing.sm,
  },
  logoutText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    padding: spacing.lg,
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
  },
  modalTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.bold,
    marginBottom: spacing.lg,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
    marginBottom: spacing.base,
    fontSize: typography.sizes.base,
  },
  saveButton: {
    paddingVertical: spacing.base,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    marginTop: spacing.base,
  },
  saveText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  cancelText: {
    textAlign: 'center',
    marginTop: spacing.lg,
    fontSize: typography.sizes.base,
  },
});
