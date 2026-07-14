import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, TextInput, Button, useTheme, ActivityIndicator } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useSQLiteContext } from 'expo-sqlite';
import { spacing, borderRadius } from '../../theme';
import { CounterpartyOverrideRepository, normalisePhone } from '../../database/repositories/CounterpartyOverrideRepository';

// SHA-256 via the Web Crypto API (available in Hermes ≥ 0.71 / RN ≥ 0.71).
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export interface CounterpartyCardProps {
  /**
   * Raw phone number as extracted from the SMS (e.g. "0712345678" or
   * "+254712345678"). The component normalises and hashes it internally.
   */
  phoneNumber: string;
  /**
   * Parser-supplied display name (may be a phone number when no name was
   * found in the SMS). Shown as placeholder when no override exists.
   */
  parsedName: string;
  /** Called after a successful save so the parent can refresh its UI. */
  onSaved?: (displayName: string) => void;
}

/**
 * Inline card that lets a user attach a permanent display name to a
 * counterparty identified by phone number (S3 counterparty disambiguation).
 *
 * The phone number is hashed before any DB write so PII is never stored in
 * plaintext. The card self-loads the current override and saves updates on
 * confirmation.
 */
export function CounterpartyCard({ phoneNumber, parsedName, onSaved }: CounterpartyCardProps) {
  const theme = useTheme();
  const db = useSQLiteContext();
  const repo = new CounterpartyOverrideRepository(db);

  const [currentName, setCurrentName] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [phoneHash, setPhoneHash] = useState<string | null>(null);

  // Hash the phone number once on mount.
  useEffect(() => {
    let cancelled = false;
    sha256Hex(normalisePhone(phoneNumber)).then((hash) => {
      if (!cancelled) setPhoneHash(hash);
    });
    return () => { cancelled = true; };
  }, [phoneNumber]);

  // Load any existing override once the hash is ready.
  useEffect(() => {
    if (!phoneHash) return;
    let cancelled = false;
    setLoading(true);
    repo.resolveDisplayName(phoneHash).then((name) => {
      if (!cancelled) {
        setCurrentName(name);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneHash]);

  const handleEdit = useCallback(() => {
    setDraft(currentName ?? parsedName);
    setEditing(true);
  }, [currentName, parsedName]);

  const handleCancel = useCallback(() => {
    setEditing(false);
    setDraft('');
  }, []);

  const handleSave = useCallback(async () => {
    if (!phoneHash || !draft.trim()) return;
    setSaving(true);
    try {
      await repo.upsert(phoneHash, draft.trim());
      setCurrentName(draft.trim());
      setEditing(false);
      onSaved?.(draft.trim());
    } finally {
      setSaving(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneHash, draft, onSaved]);

  const handleClear = useCallback(async () => {
    if (!phoneHash) return;
    await repo.delete(phoneHash);
    setCurrentName(null);
    setDraft('');
    setEditing(false);
    onSaved?.(parsedName);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phoneHash, parsedName, onSaved]);

  const displayedName = currentName ?? parsedName;
  const hasOverride = currentName !== null;

  return (
    <View style={[styles.card, { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.outlineVariant }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: `${theme.colors.primary}20` }]}>
          <Ionicons name="person-circle-outline" size={20} color={theme.colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>
            COUNTERPARTY
          </Text>
          {loading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} style={styles.loader} />
          ) : (
            <Text
              variant="bodyLarge"
              style={{ color: hasOverride ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}
              numberOfLines={1}
            >
              {displayedName}
            </Text>
          )}
        </View>
        {!loading && !editing && (
          <Button
            mode="text"
            compact
            onPress={handleEdit}
            labelStyle={{ color: theme.colors.primary, fontSize: 12 }}
          >
            {hasOverride ? 'Edit' : 'Name'}
          </Button>
        )}
      </View>

      {editing && (
        <View style={styles.editArea}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder={parsedName}
            mode="outlined"
            dense
            style={styles.input}
            autoFocus
            onSubmitEditing={handleSave}
            returnKeyType="done"
          />
          <View style={styles.actions}>
            {hasOverride && (
              <Button
                mode="text"
                compact
                onPress={handleClear}
                labelStyle={{ color: theme.colors.error, fontSize: 12 }}
              >
                Clear
              </Button>
            )}
            <Button mode="text" compact onPress={handleCancel} labelStyle={{ fontSize: 12 }}>
              Cancel
            </Button>
            <Button
              mode="contained"
              compact
              onPress={handleSave}
              loading={saving}
              disabled={saving || !draft.trim()}
              labelStyle={{ fontSize: 12 }}
            >
              Save
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  loader: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  editArea: {
    gap: spacing.sm,
  },
  input: {
    backgroundColor: 'transparent',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.xs,
  },
});
