import React, { useEffect, useState } from 'react';
import {
  View,
  Image,
  StyleSheet,
  ScrollView,
  Modal,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { useNavigation } from '@react-navigation/native';
import { format } from 'date-fns';
import { Card, Text, Button, IconButton, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { TopBanner } from '../../components/common/TopBanner';
import { spacing, BOTTOM_NAV_SAFE_AREA } from '../../theme';

type ToolItem = {
  icon: any;
  label: string;
  color: string;
  route: string;
};

const TOOL_HUB: ToolItem[] = [
  { icon: 'analytics-outline', label: 'Analytics', color: '#2DD4BF', route: 'Insights' },
  { icon: 'compass-outline', label: 'Review', color: '#A78BFA', route: 'WeekReview' },
  { icon: 'search-outline', label: 'Search', color: '#60A5FA', route: 'Search' },
  { icon: 'repeat-outline', label: 'Recurring', color: '#34D399', route: 'Recurring' },
  { icon: 'download-outline', label: 'Export', color: '#FBBF24', route: 'Export' },
  { icon: 'library-outline', label: 'Hub', color: '#22D3EE', route: 'Planner' },
];

function ToolHubCard({ item, onPress }: { item: ToolItem; onPress: () => void }) {
  const theme = useTheme();
  return (
    <TouchableRipple
      onPress={onPress}
      rippleColor={`${item.color}44`}
      style={[styles.toolCard, { backgroundColor: `${item.color}14`, borderRadius: 12, overflow: 'hidden' }]}
      borderless
    >
      <View style={styles.toolContent}>
        <View style={[styles.toolIconBox, { backgroundColor: `${item.color}28` }]}>
          <Ionicons name={item.icon as any} size={24} color={item.color} />
        </View>
        <Text variant="bodySmall" style={{ color: theme.colors.onSurface, textAlign: 'center' }} numberOfLines={1}>
          {item.label}
        </Text>
      </View>
    </TouchableRipple>
  );
}

const USERNAME_MAX = 8;
const WARNING = '#F5CB5C';

export function ProfileScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const profile = useAppStore((state) => state.profile);
  const setProfile = useAppStore((state) => state.setProfile);

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState(profile?.name ?? '');
  const [editUsername, setEditUsername] = useState(profile?.username ?? '');
  const [usernameError, setUsernameError] = useState('');
  const [photoSheetVisible, setPhotoSheetVisible] = useState(false);
  const [photoViewerVisible, setPhotoViewerVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!successMessage) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const handleSaveProfile = () => {
    const trimmedUsername = editUsername.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (trimmedUsername.length > USERNAME_MAX) {
      setUsernameError(`Username must be ${USERNAME_MAX} characters or fewer`);
      return;
    }
    setUsernameError('');
    setProfile({
      id: profile?.id ?? 'default',
      name: editName.trim() || 'User',
      username: trimmedUsername || undefined,
      avatarUri: profile?.avatarUri,
      createdAt: profile?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setEditVisible(false);
    setSuccessMessage('Profile updated');
  };

  const handleUsernameChange = (text: string) => {
    const cleaned = text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, USERNAME_MAX);
    setEditUsername(cleaned);
    setUsernameError('');
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
      if (profile?.avatarUri) {
        await FileSystem.deleteAsync(profile.avatarUri, { idempotent: true }).catch(() => {});
      }
      const dest = `${FileSystem.documentDirectory}avatar_${Date.now()}.jpg`;
      await FileSystem.copyAsync({ from: result.assets[0].uri, to: dest });
      setProfile(profile ? { ...profile, avatarUri: dest, updatedAt: new Date().toISOString() } : null);
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

  const displayUsername = profile?.username ? `@${profile.username}` : 'No username set';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner
        tone="success"
        message={successMessage ?? ''}
        visible={!!successMessage}
        onDismiss={() => setSuccessMessage(null)}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="headlineSmall" style={{ color: theme.colors.onSurface }}>
          Profile
        </Text>

        <GlassCard style={styles.heroCard}>
          <View style={styles.heroTop}>
            <TouchableRipple
              style={[styles.avatarRing, { borderColor: theme.colors.primary }]}
              onPress={() => setPhotoSheetVisible(true)}
              borderless
            >
              <View style={styles.avatarRingInner}>
                {profile?.avatarUri ? (
                  <Image source={{ uri: profile.avatarUri }} style={styles.avatarImage} />
                ) : (
                  <View style={[styles.avatar, { backgroundColor: theme.colors.primary }]}>
                    <Text variant="headlineSmall" style={{ color: theme.colors.onPrimary }}>
                      {initials}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableRipple>

            <View style={styles.heroInfo}>
              <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1} ellipsizeMode="tail">
                {profile?.name?.trim() || 'Set up your profile'}
              </Text>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary }} numberOfLines={1}>
                {displayUsername}
              </Text>
              {memberSince && (
                <View style={[styles.memberBadge, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                    Member since {memberSince}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.heroButtons}>
            <Button
              mode="outlined"
              icon={() => <Ionicons name="create-outline" size={16} color={theme.colors.primary} />}
              onPress={() => {
                setEditName(profile?.name ?? '');
                setEditUsername(profile?.username ?? '');
                setUsernameError('');
                setEditVisible(true);
              }}
              style={[styles.heroBtn, { borderColor: theme.colors.outlineVariant }]}
              textColor={theme.colors.primary}
            >
              Edit Profile
            </Button>
            <Button
              mode="outlined"
              icon={() => <Ionicons name="settings-outline" size={16} color={theme.colors.primary} />}
              onPress={() => navigation.navigate('Settings')}
              style={[styles.heroBtn, { borderColor: theme.colors.outlineVariant }]}
              textColor={theme.colors.primary}
            >
              Settings
            </Button>
          </View>
        </GlassCard>

        <GlassCard style={styles.toolHub}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.base }}>
            TOOL HUB
          </Text>
          <View style={styles.toolGrid}>
            {TOOL_HUB.map((item) => (
              <ToolHubCard
                key={item.label}
                item={item}
                onPress={() => navigation.navigate(item.route)}
              />
            ))}
          </View>
        </GlassCard>
      </ScrollView>

      <Modal visible={editVisible} transparent animationType="slide" onRequestClose={() => setEditVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              Edit Profile
            </Text>

            <View>
              <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.xs }}>
                Full name
              </Text>
              <TextInput
                mode="outlined"
                dense
                value={editName}
                onChangeText={setEditName}
                placeholder="Full name"
                style={{ backgroundColor: theme.colors.surfaceVariant }}
                autoCapitalize="words"
              />
            </View>

            <View>
              <View style={styles.fieldLabelRow}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                  Username
                </Text>
                <Text
                  variant="bodySmall"
                  style={{
                    color: editUsername.length >= USERNAME_MAX ? WARNING : theme.colors.onSurfaceVariant,
                  }}
                >
                  {editUsername.length}/{USERNAME_MAX}
                </Text>
              </View>
              <TextInput
                mode="outlined"
                dense
                value={editUsername}
                onChangeText={handleUsernameChange}
                placeholder="e.g. john"
                style={{ backgroundColor: theme.colors.surfaceVariant }}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={USERNAME_MAX}
              />
              {usernameError ? (
                <Text variant="bodySmall" style={{ color: theme.colors.error, marginTop: spacing.xs }}>
                  {usernameError}
                </Text>
              ) : (
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant, marginTop: spacing.xs }}>
                  Shown in the app greeting · letters, numbers, _ only
                </Text>
              )}
            </View>

            <Button mode="contained" onPress={handleSaveProfile}>
              Save
            </Button>
            <Button mode="text" onPress={() => setEditVisible(false)} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      <Modal visible={photoSheetVisible} transparent animationType="slide" onRequestClose={() => setPhotoSheetVisible(false)}>
        <TouchableRipple
          style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}
          onPress={() => setPhotoSheetVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>
              Profile Photo
            </Text>
            {profile?.avatarUri && (
              <TouchableRipple onPress={() => { setPhotoSheetVisible(false); setPhotoViewerVisible(true); }}>
                <View style={styles.photoSheetOption}>
                  <Ionicons name="eye-outline" size={20} color={theme.colors.onSurface} />
                  <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>View</Text>
                </View>
              </TouchableRipple>
            )}
            <TouchableRipple onPress={handleChooseFromGallery}>
              <View style={styles.photoSheetOption}>
                <Ionicons name="image-outline" size={20} color={theme.colors.onSurface} />
                <Text variant="bodyLarge" style={{ color: theme.colors.onSurface }}>Choose from gallery</Text>
              </View>
            </TouchableRipple>
            {profile?.avatarUri && (
              <TouchableRipple onPress={handleRemovePhoto}>
                <View style={styles.photoSheetOption}>
                  <Ionicons name="trash-outline" size={20} color={theme.colors.error} />
                  <Text variant="bodyLarge" style={{ color: theme.colors.error }}>Remove</Text>
                </View>
              </TouchableRipple>
            )}
            <Button mode="text" onPress={() => setPhotoSheetVisible(false)} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
          </View>
        </TouchableRipple>
      </Modal>

      <Modal visible={photoViewerVisible} transparent animationType="fade" onRequestClose={() => setPhotoViewerVisible(false)}>
        <Pressable style={styles.photoViewerOverlay} onPress={() => setPhotoViewerVisible(false)}>
          {profile?.avatarUri && (
            <Image source={{ uri: profile.avatarUri }} style={styles.photoViewerImage} resizeMode="contain" />
          )}
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    paddingBottom: BOTTOM_NAV_SAFE_AREA,
    gap: spacing.base,
  },
  heroCard: {},
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, marginBottom: spacing.base },
  avatarRing: { width: 84, height: 84, borderRadius: 42, borderWidth: 2, padding: 3, justifyContent: 'center', alignItems: 'center' },
  avatarRingInner: { width: 74, height: 74, justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 74, height: 74, borderRadius: 37, justifyContent: 'center', alignItems: 'center' },
  avatarImage: { width: 74, height: 74, borderRadius: 37 },
  heroInfo: { flex: 1, gap: 4 },
  memberBadge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 4, borderRadius: 9999 },
  heroButtons: { flexDirection: 'row', gap: spacing.sm },
  heroBtn: { flex: 1, borderRadius: 9999 },
  toolHub: {},
  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  toolCard: { width: '30%', flexGrow: 1, borderRadius: 12 },
  toolContent: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  toolIconBox: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    gap: spacing.base,
  },
  fieldLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  photoSheetOption: { flexDirection: 'row', alignItems: 'center', gap: spacing.base, paddingVertical: spacing.base },
  photoViewerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.9)', justifyContent: 'center', alignItems: 'center' },
  photoViewerImage: { width: '90%', height: '70%' },
});
