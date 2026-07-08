import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  ScrollView,
} from 'react-native';
import { TopBanner } from '../../components/common/TopBanner';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Text, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { useAppStore } from '../../store';
import { GlassCard } from '../../components/common/GlassCard';
import { spacing, borderRadius } from '../../theme';

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
  const theme = useTheme();
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
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <TopBanner tone="success" message={successMsg ?? ''} visible={!!successMsg} autoDismissMs={2000} onDismiss={() => setSuccessMsg(null)} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, flex: 1, textAlign: 'center' }} numberOfLines={1}>Personal Information</Text>
          <View style={styles.headerSpacer} />
        </View>

        <GlassCard style={styles.card}>
          <View style={styles.cardHeader}>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
              Personal Information
            </Text>
            <Ionicons name="pencil" size={18} color={theme.colors.primary} />
          </View>

          {rows.map((row, index) => (
            <View
              key={row.key}
              style={[
                styles.row,
                index < rows.length - 1 && { borderBottomColor: theme.colors.outlineVariant, borderBottomWidth: 1 },
              ]}
            >
              <View style={[styles.iconCircle, { backgroundColor: theme.colors.surfaceVariant }]}>
                <Ionicons name={row.icon} size={20} color={theme.colors.primary} />
              </View>
              <View style={styles.rowText}>
                <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>{row.label}</Text>
                <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                  {row.value || row.placeholder}
                </Text>
              </View>
              <IconButton
                icon={() => <Ionicons name="pencil" size={18} color={theme.colors.primary} />}
                size={18}
                onPress={() => handleEdit(row)}
                style={{ margin: 0 }}
              />
            </View>
          ))}
        </GlassCard>
      </ScrollView>

      <Modal visible={!!editingRow} transparent animationType="slide">
        <View style={[styles.modalOverlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.lg }}>
              Edit {editingRow?.label}
            </Text>
            <TextInput
              mode="outlined"
              dense
              style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }}
              textColor={theme.colors.onSurface}
              placeholder={editingRow?.placeholder}
              placeholderTextColor={theme.colors.outline}
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
            <Button mode="contained" onPress={handleSave}>
              Save
            </Button>
            <Button mode="text" onPress={() => setEditKey(null)} textColor={theme.colors.onSurfaceVariant}>
              Cancel
            </Button>
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
  headerSpacer: {
    width: 40,
  },
  content: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
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
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowText: {
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalContent: {
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.lg,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
  },
});
