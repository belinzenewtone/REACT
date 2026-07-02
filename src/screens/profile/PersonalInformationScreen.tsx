import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useThemeColors } from '../../hooks/useThemeColors';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, typography, borderRadius } from '../../theme';

interface InfoRow {
  key: 'name' | 'email' | 'username';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  value: string;
  placeholder: string;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'words';
}

export function PersonalInformationScreen() {
  const colors = useThemeColors();
  const navigation = useNavigation();
  const profile = useAppStore((state) => state.profile);
  const updateProfile = useAppStore((state) => state.updateProfile);

  const [editKey, setEditKey] = useState<InfoRow['key'] | null>(null);
  const [editValue, setEditValue] = useState('');
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const displayUsername = profile?.username ?? profile?.name.split(' ')[0] ?? '';

  const rows: InfoRow[] = [
    {
      key: 'name',
      label: 'Name',
      icon: 'person-outline',
      value: profile?.name ?? '',
      placeholder: 'Your name',
      autoCapitalize: 'words',
    },
    {
      key: 'email',
      label: 'Email',
      icon: 'mail-outline',
      value: profile?.email ?? '',
      placeholder: 'your@email.com',
      keyboardType: 'email-address',
      autoCapitalize: 'none',
    },
    {
      key: 'username',
      label: 'Username',
      icon: 'person-outline',
      value: displayUsername,
      placeholder: 'Username',
      autoCapitalize: 'none',
    },
  ];

  const handleEdit = (row: InfoRow) => {
    setEditValue(row.value);
    setEditKey(row.key);
  };

  const handleSave = () => {
    if (!editKey) return;
    const trimmed = editValue.trim();
    if (editKey === 'name') {
      updateProfile({ name: trimmed || profile?.name });
      setSuccessMsg('Name updated');
    } else if (editKey === 'email') {
      updateProfile({ email: trimmed || undefined });
      setSuccessMsg('Email updated');
    } else if (editKey === 'username') {
      const cleaned = trimmed.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8);
      updateProfile({ username: cleaned || undefined });
      setSuccessMsg('Username updated');
    }
    setEditKey(null);
  };

  const editingRow = rows.find((r) => r.key === editKey);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <TopBanner tone="success" message={successMsg ?? ''} visible={!!successMsg} autoDismissMs={2000} onDismiss={() => setSuccessMsg(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Personal Information</Text>
          <View style={styles.headerSpacer} />
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>
              Personal Information
            </Text>
            <Ionicons name="pencil" size={18} color={colors.accentPrimary} />
          </View>

          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.row,
                index < rows.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: colors.glassWhiteStrong }]}>
                <Ionicons name={row.icon} size={20} color={colors.accentPrimary} />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.textSecondary }]}>{row.label}</Text>
                <Text style={[styles.rowValue, { color: colors.textPrimary }]} numberOfLines={1}>
                  {row.value || row.placeholder}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleEdit(row)}>
                <Ionicons name="pencil" size={18} color={colors.accentPrimary} />
              </TouchableOpacity>
            </View>
          ))}
        </GlassCard>
      </ScrollView>

      <Modal visible={!!editingRow} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: colors.glassBlack }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.bgSecondary }]}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              Edit {editingRow?.label}
            </Text>
            <TextInput
              style={[
                styles.modalInput,
                {
                  color: colors.textPrimary,
                  borderColor: colors.border,
                  backgroundColor: colors.glassWhite,
                },
              ]}
              placeholder={editingRow?.placeholder}
              placeholderTextColor={colors.textTertiary}
              value={editValue}
              onChangeText={(text) => {
                if (editKey === 'username') {
                  setEditValue(text.toLowerCase().replace(/[^a-z0-9_]/g, '').slice(0, 8));
                } else {
                  setEditValue(text);
                }
              }}
              keyboardType={editingRow?.keyboardType ?? 'default'}
              autoCapitalize={editingRow?.autoCapitalize ?? 'none'}
              autoFocus
              maxLength={editKey === 'username' ? 8 : undefined}
            />
            <TouchableOpacity
              style={[styles.saveButton, { backgroundColor: colors.accentPrimary }]}
              onPress={handleSave}
            >
              <Text style={[styles.saveText, { color: colors.textInverse }]}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setEditKey(null)}>
              <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
  backButton: {
    padding: spacing.sm,
    marginLeft: -spacing.sm,
  },
  title: {
    flex: 1,
    fontSize: typography.sizes['2xl'],
    fontWeight: typography.weights.bold,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
  },
  card: {
    padding: 0,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: 'transparent',
  },
  cardTitle: {
    fontSize: typography.sizes.lg,
    fontWeight: typography.weights.semibold,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.md,
    gap: spacing.base,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  rowLabel: {
    fontSize: typography.sizes.sm,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg,
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
