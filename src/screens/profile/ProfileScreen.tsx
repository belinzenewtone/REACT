import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
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
  const navigation = useNavigation<any>();
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? '');
  const [editEmail, setEditEmail] = useState(profile?.email ?? '');
  const [editPhone, setEditPhone] = useState(profile?.phone ?? '');
  const [securityExpanded, setSecurityExpanded] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleSaveProfile = () => {
    setProfile({
      id: profile?.id ?? 'default',
      name: editName.trim() || 'User',
      email: editEmail.trim() || undefined,
      phone: editPhone.trim() || undefined,
      avatarUri: profile?.avatarUri,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setEditVisible(false);
    setSuccessMessage('Profile updated');
  };

  const handleChooseFromGallery = async () => {
    setPhotoSheetVisible(false);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Permission needed', 'Allow photo library access to choose a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setProfile(profile ? { ...profile, avatarUri: result.assets[0].uri, updatedAt: new Date().toISOString() } : null);
      setSuccessMessage('Profile photo updated');
    }
  };

  const handleRemovePhoto = () => {
    setPhotoSheetVisible(false);
    if (profile) {
      setProfile({ ...profile, avatarUri: undefined, updatedAt: new Date().toISOString() });
      setSuccessMessage('Profile photo removed');
    }
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
      <TopBanner
        tone="success"
        message={successMessage ?? ''}
        visible={!!successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Profile</Text>

        {/* ── Hero Card ── */}
        <GlassCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            {/* Avatar */}
            <TouchableOpacity
              style={[styles.avatarRing, { borderColor: colors.accentPrimary }]}
              onPress={() => setPhotoSheetVisible(true)}
              activeOpacity={0.8}
            >
              {profile?.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={[styles.avatar, { backgroundColor: colors.accentPrimary }]}>
                  <Text style={[styles.initials, { color: colors.textInverse }]}>{initials}</Text>
                </View>
              )}
              <View style={[styles.avatarEditBadge, { backgroundColor: colors.bgSecondary, borderColor: colors.bgPrimary }]}>
                <Ionicons name="camera" size={12} color={colors.textPrimary} />
              </View>
            </TouchableOpacity>

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
                    setSuccessMessage('Password updated');
                  }}
                >
                  <Text style={[styles.pwBtnText, { color: colors.textInverse }]}>Update</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </GlassCard>

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

      {/* Photo Management Bottom Sheet */}
      <Modal visible={photoSheetVisible} transparent animationType="slide" onRequestClose={() => setPhotoSheetVisible(false)}>
        <TouchableOpacity
          style={[styles.modalOverlay, { backgroundColor: colors.glassBlack }]}
          activeOpacity={1}
          onPress={() => setPhotoSheetVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Profile Photo</Text>
            {profile?.avatarUri && (
              <TouchableOpacity
                style={styles.photoSheetOption}
                onPress={() => {
                  setPhotoSheetVisible(false);
                  setPhotoViewerVisible(true);
                }}
              >
                <Ionicons name="eye-outline" size={20} color={colors.textPrimary} />
                <Text style={[styles.photoSheetOptionText, { color: colors.textPrimary }]}>View</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.photoSheetOption} onPress={handleChooseFromGallery}>
              <Ionicons name="image-outline" size={20} color={colors.textPrimary} />
              <Text style={[styles.photoSheetOptionText, { color: colors.textPrimary }]}>Choose from gallery</Text>
            </TouchableOpacity>
            {profile?.avatarUri && (
              <TouchableOpacity style={styles.photoSheetOption} onPress={handleRemovePhoto}>
                <Ionicons name="trash-outline" size={20} color={colors.danger} />
                <Text style={[styles.photoSheetOptionText, { color: colors.danger }]}>Remove</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={() => setPhotoSheetVisible(false)} style={styles.photoSheetCancel}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Photo Viewer */}
      <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
        <TouchableOpacity
          style={styles.photoViewerOverlay}
          activeOpacity={1}
          onPress={() => setPhotoViewerVisible(false)}
        >
          {profile?.avatarUri && (
            <Image source={{ uri: profile.avatarUri }} style={styles.photoViewerImage} resizeMode="contain" />
          )}
        </TouchableOpacity>
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
  avatarImage: { width: 74, height: 74, borderRadius: 37 },
  avatarEditBadge: {
    position: 'absolute', bottom: -2, right: -2, width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, justifyContent: 'center', alignItems: 'center',
  },
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
  // Modal
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: { padding: spacing.lg, borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], gap: spacing.base },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  modalInput: { borderWidth: 1, borderRadius: borderRadius.lg, paddingHorizontal: spacing.base, paddingVertical: spacing.base, fontSize: typography.sizes.base },
  saveButton: { paddingVertical: spacing.base, borderRadius: borderRadius.lg, alignItems: 'center' },
  saveText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  // Photo sheet
  photoSheetOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingVertical: spacing.base },
  photoSheetOptionText: { fontSize: typography.sizes.base, fontWeight: typography.weights.medium },
  photoSheetCancel: { alignItems: 'center', paddingTop: spacing.sm },
  photoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  photoViewerImage: { width: '90%', height: '70%' },
  cancelText: { textAlign: 'center', fontSize: typography.sizes.base },
});
