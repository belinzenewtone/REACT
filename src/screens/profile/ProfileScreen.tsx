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
import { format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore, useProfileStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { formatCurrency } from '../../utils/formatters';
import { spacing, typography, borderRadius } from '../../theme';

type ToolItem = {
  icon: any;
  label: string;
  color: string;
  route: string;
};

const TOOL_HUB: ToolItem[] = [
  { icon: 'analytics-outline', label: 'Insights', color: '#2DD4BF', route: 'Insights' },
  { icon: 'compass-outline', label: 'Review', color: '#A78BFA', route: 'WeekReview' },
  { icon: 'search-outline', label: 'Search', color: '#60A5FA', route: 'Search' },
  { icon: 'repeat-outline', label: 'Recurring', color: '#34D399', route: 'Recurring' },
  { icon: 'download-outline', label: 'Export', color: '#FBBF24', route: 'Export' },
  { icon: 'library-outline', label: 'Hub', color: '#22D3EE', route: 'Planner' },
];

function ToolHubCard({ item, onPress, colors }: { item: ToolItem; onPress: () => void; colors: any }) {
  return (
    <TouchableOpacity
      style={[styles.toolCard, { backgroundColor: colors.bgTertiary }]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={[styles.toolIconBox, { backgroundColor: `${item.color}26` }]}>
        <Ionicons name={item.icon as any} size={24} color={item.color} />
      </View>
      <Text style={[styles.toolLabel, { color: colors.textPrimary }]}>{item.label}</Text>
    </TouchableOpacity>
  );
}

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
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');

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

  const memberSince = profile?.createdAt
    ? format(new Date(profile.createdAt), 'MMM yyyy')
    : null;

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
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Profile</Text>

        {/* ── Hero Card ── */}
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            {/* Avatar */}
            <View style={[styles.avatarRing, { borderColor: colors.accentPrimary }]}>
              <View style={[styles.avatar, { backgroundColor: colors.accentPrimary }]}>
                <Text style={[styles.initials, { color: colors.textInverse }]}>{initials}</Text>
              </View>
            </View>

            {/* Info */}
            <View style={styles.heroInfo}>
              <Text style={[styles.heroName, { color: colors.textPrimary }]} numberOfLines={1}>
                {profile?.name?.trim() || 'Set up your profile'}
              </Text>
              <Text style={[styles.heroWorkspace, { color: colors.textSecondary }]}>Local Workspace</Text>
              {memberSince && (
                <View style={[styles.memberBadge, { backgroundColor: colors.bgTertiary }]}>
                  <Text style={[styles.memberBadgeText, { color: colors.textSecondary }]}>
                    Member since {memberSince}
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Buttons */}
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={[styles.heroBtn, { borderColor: colors.border }]}
              onPress={() => {
                setEditName(profile?.name ?? '');
                setEditEmail(profile?.email ?? '');
                setEditPhone(profile?.phone ?? '');
                setEditVisible(true);
              }}
            >
              <Ionicons name="create-outline" size={16} color={colors.accentPrimary} />
              <Text style={[styles.heroBtnText, { color: colors.accentPrimary }]}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.heroBtn, { borderColor: colors.border }]}
              onPress={() => navigation.navigate('Settings')}
            >
              <Ionicons name="settings-outline" size={16} color={colors.accentPrimary} />
              <Text style={[styles.heroBtnText, { color: colors.accentPrimary }]}>Settings</Text>
            </TouchableOpacity>
          </View>
        </GlassCard>

        {/* ── Tool Hub ── */}
        <GlassCard style={styles.toolHub}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>TOOL HUB</Text>
          <View style={styles.toolGrid}>
            {TOOL_HUB.map((item) => (
              <ToolHubCard
                key={item.label}
                item={item}
                colors={colors}
                onPress={() => navigation.navigate(item.route)}
              />
            ))}
          </View>
        </GlassCard>

        {/* ── Security Section ── */}
        <GlassCard>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>SECURITY</Text>
          <TouchableOpacity
            style={styles.securityHeader}
            onPress={() => setSecurityExpanded((v) => !v)}
          >
            <View style={[styles.securityIconBox, { backgroundColor: colors.bgTertiary }]}>
              <Ionicons name="lock-closed-outline" size={18} color={colors.textSecondary} />
            </View>
            <Text style={[styles.securityTitle, { color: colors.textPrimary }]}>Password</Text>
            <Ionicons
              name={securityExpanded ? 'chevron-up' : 'chevron-down'}
              size={20}
              color={colors.textTertiary}
            />
          </TouchableOpacity>

          {securityExpanded && (
            <View style={styles.securityForm}>
              <View style={[styles.formDivider, { backgroundColor: colors.border }]} />
              <TextInput
                style={[styles.formInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bgTertiary }]}
                placeholder="Current password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={currentPw}
                onChangeText={setCurrentPw}
              />
              <TextInput
                style={[styles.formInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bgTertiary }]}
                placeholder="New password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={newPw}
                onChangeText={setNewPw}
              />
              <TextInput
                style={[styles.formInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bgTertiary }]}
                placeholder="Confirm new password"
                placeholderTextColor={colors.textTertiary}
                secureTextEntry
                value={confirmPw}
                onChangeText={setConfirmPw}
              />
              {pwError ? <Text style={[styles.pwError, { color: colors.danger }]}>{pwError}</Text> : null}
              <View style={styles.pwButtons}>
                <TouchableOpacity
                  style={[styles.pwBtn, { borderColor: colors.border }]}
                  onPress={() => {
                    setSecurityExpanded(false);
                    setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwError('');
                  }}
                >
                  <Text style={[styles.pwBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.pwBtn, { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }]}
                  onPress={() => {
                    if (!currentPw) { setPwError('Enter current password'); return; }
                    if (newPw.length < 4) { setPwError('New password too short'); return; }
                    if (newPw !== confirmPw) { setPwError('Passwords do not match'); return; }
                    setPwError('');
                    setCurrentPw(''); setNewPw(''); setConfirmPw('');
                    setSecurityExpanded(false);
                  }}
                >
                  <Text style={[styles.pwBtnText, { color: colors.textInverse }]}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GlassCard>

        {/* ── Account Stats ── */}
        <Text style={[styles.statsSectionTitle, { color: colors.textSecondary }]}>Account Statistics</Text>
        <View style={styles.statsGrid}>
          {[
            { label: 'Transactions', value: stats?.totalTransactions ?? 0 },
            { label: 'Total Spend', value: formatCurrency(stats?.totalSpend ?? 0) },
            { label: 'Total Income', value: formatCurrency(stats?.totalIncome ?? 0) },
            { label: 'Average Tx', value: formatCurrency(stats?.averageTransaction ?? 0) },
            { label: 'Most Common', value: stats?.mostCommonMerchant ?? '-' },
            { label: 'Largest Tx', value: stats?.largestTransaction ? formatCurrency(stats.largestTransaction.amount) : '-' },
          ].map((s) => (
            <GlassCard key={s.label} style={styles.statCard}>
              <Text style={[styles.statValue, { color: colors.textPrimary }]} numberOfLines={1}>{s.value}</Text>
              <Text style={[styles.statLabel, { color: colors.textTertiary }]}>{s.label}</Text>
            </GlassCard>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutButton, { backgroundColor: `${colors.danger}20` }]}
          onPress={() => setHasCompletedOnboarding(false)}
        >
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={[styles.logoutText, { color: colors.danger }]}>Reset onboarding</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Edit Profile Modal */}
      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.glassBlack }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Edit Profile</Text>
            {[
              { value: editName, setter: setEditName, placeholder: 'Name', keyboard: 'default' as const },
              { value: editEmail, setter: setEditEmail, placeholder: 'Email', keyboard: 'email-address' as const },
              { value: editPhone, setter: setEditPhone, placeholder: 'Phone', keyboard: 'phone-pad' as const },
            ].map((f) => (
              <TextInput
                key={f.placeholder}
                style={[styles.modalInput, { color: colors.textPrimary, borderColor: colors.border, backgroundColor: colors.glassWhite }]}
                placeholder={f.placeholder}
                placeholderTextColor={colors.textTertiary}
                value={f.value}
                onChangeText={f.setter}
                keyboardType={f.keyboard}
                autoCapitalize={f.keyboard === 'email-address' ? 'none' : 'words'}
              />
            ))}
            <TouchableOpacity style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]} onPress={handleSaveProfile}>
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

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: spacing.lg, paddingBottom: spacing['4xl'], gap: spacing.base },
  pageTitle: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold },
  // Hero
  heroCard: {},
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginBottom: spacing.base },
  avatarRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, padding: 3, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 74, height: 74, borderRadius: 37, justifyContent: 'center', alignItems: 'center' },
  initials: { fontSize: typography.sizes['2xl'], fontWeight: typography.weights.bold },
  heroInfo: { flex: 1, gap: 4 },
  heroName: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  heroWorkspace: { fontSize: typography.sizes.sm },
  memberBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: borderRadius.full },
  memberBadgeText: { fontSize: typography.sizes.xs },
  heroButtons: { flexDirection: 'row', gap: spacing.sm },
  heroBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.sm, gap: 6,
  },
  heroBtnText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  // Tool Hub
  toolHub: {},
  sectionLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.semibold, marginBottom: spacing.base, letterSpacing: 0.8 },
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toolCard: { width: '30%', flexGrow: 1, borderRadius: borderRadius.lg, padding: spacing.sm, alignItems: 'center', gap: spacing.sm },
  toolIconBox: { width: 44, height: 44, borderRadius: borderRadius.md, justifyContent: 'center', alignItems: 'center' },
  toolLabel: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  // Security
  securityHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  securityIconBox: { width: 36, height: 36, borderRadius: borderRadius.sm, justifyContent: 'center', alignItems: 'center' },
  securityTitle: { flex: 1, fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  securityForm: { gap: spacing.sm, marginTop: spacing.sm },
  formDivider: { height: 1 },
  formInput: { borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: typography.sizes.base },
  pwError: { fontSize: typography.sizes.xs },
  pwButtons: { flexDirection: 'row', gap: spacing.sm },
  pwBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.sm, alignItems: 'center' },
  pwBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  // Stats
  statsSectionTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium, marginTop: spacing.sm },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  statCard: { flex: 1, minWidth: '30%' },
  statValue: { fontSize: typography.sizes.base, fontWeight: typography.weights.bold },
  statLabel: { fontSize: typography.sizes.xs, marginTop: 4 },
  // Logout
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.base, borderRadius: borderRadius.lg, gap: spacing.sm },
  logoutText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { padding: spacing.lg, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], gap: spacing.base },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  modalInput: { borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.base, fontSize: typography.sizes.base },
  saveButton: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
  saveText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  cancelText: { textAlign: 'center', fontSize: typography.sizes.base },
});
