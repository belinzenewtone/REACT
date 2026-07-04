import React, { useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { Text, Card, Chip, FAB, TextInput, Button, IconButton, useTheme } from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';
import { GlassCard } from '../../components/common/GlassCard';

type LearningSession = {
  id: number;
  title: string;
  category: string;
  description: string;
  duration_minutes: number;
  is_completed: number;
  progress: number;
  created_at: string;
};

const CATEGORIES = ['All', 'Finance', 'Technology', 'Health', 'Leadership', 'Mindfulness', 'Career'];

const CATEGORY_COLORS: Record<string, string> = {
  Finance: '#F5CB5C',
  Technology: '#7FC8F8',
  Health: '#7BC47B',
  Leadership: '#D0BCFF',
  Mindfulness: '#F2B8B5',
  Career: '#67D4E0',
};

function ProgressBar({ progress, color }: { progress: number; color: string }) {
  const theme = useTheme();
  return (
    <View style={[styles.progressTrack, { backgroundColor: theme.colors.outlineVariant }]}>
      <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function SessionCard({ session, onTap }: { session: LearningSession; onTap: () => void }) {
  const theme = useTheme();
  const isCompleted = session.is_completed === 1;
  const categoryColor = CATEGORY_COLORS[session.category] ?? theme.colors.primary;

  return (
    <Card
      style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }}
      mode="elevated"
      onPress={onTap}
    >
      <Card.Content style={{ gap: spacing.sm }}>
        <View style={styles.sessionTop}>
          <View style={styles.sessionMeta}>
            <Text variant="bodySmall" style={{ color: categoryColor, marginBottom: 2 }}>{session.category}</Text>
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>{session.title}</Text>
          </View>
          {isCompleted && (
            <Ionicons name="checkmark-circle" size={22} color="#7BC47B" />
          )}
        </View>

        {session.description ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={2}>
            {session.description}
          </Text>
        ) : null}

        <View style={styles.sessionFooter}>
          <Ionicons name="timer-outline" size={13} color={theme.colors.outline} />
          <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
            {session.duration_minutes} min
          </Text>
        </View>

        {session.progress > 0 && !isCompleted && (
          <ProgressBar progress={session.progress} color={theme.colors.primary} />
        )}

        {!isCompleted && (
          <Chip
            style={{ backgroundColor: `${theme.colors.primary}18`, alignSelf: 'flex-start' }}
            textStyle={{ color: theme.colors.primary }}
          >
            {session.progress > 0 ? 'Continue' : 'Start'}
          </Chip>
        )}
      </Card.Content>
    </Card>
  );
}

function LogSessionModal({
  visible,
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (topic: string, duration: number, notes: string) => void;
}) {
  const theme = useTheme();
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState({ topic: false, duration: false });

  function handleSave() {
    const durationNum = parseInt(duration, 10);
    const newErrors = { topic: !topic.trim(), duration: !durationNum || durationNum <= 0 };
    setErrors(newErrors);
    if (newErrors.topic || newErrors.duration) return;
    onSave(topic.trim(), durationNum, notes.trim());
    setTopic(''); setDuration(''); setNotes('');
    setErrors({ topic: false, duration: false });
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.lg }}>Log Learning Session</Text>

          <TextInput
            mode="outlined"
            dense
            style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }}
            textColor={theme.colors.onSurface}
            placeholder="Topic (e.g. Kotlin Coroutines)"
            placeholderTextColor={theme.colors.outline}
            value={topic}
            onChangeText={(v) => { setTopic(v); setErrors((e) => ({ ...e, topic: false })); }}
          />
          <TextInput
            mode="outlined"
            dense
            style={{ backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }}
            textColor={theme.colors.onSurface}
            placeholder="Duration (minutes)"
            placeholderTextColor={theme.colors.outline}
            value={duration}
            onChangeText={(v) => { setDuration(v); setErrors((e) => ({ ...e, duration: false })); }}
            keyboardType="number-pad"
          />
          <TextInput
            mode="outlined"
            dense
            style={[styles.notesInput, { backgroundColor: theme.colors.surfaceVariant, marginBottom: spacing.base }]}
            textColor={theme.colors.onSurface}
            placeholder="Notes (optional)"
            placeholderTextColor={theme.colors.outline}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <Button mode="outlined" onPress={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button mode="contained" onPress={handleSave} style={{ flex: 1 }}>
              Log
            </Button>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LearningScreen() {
  const theme = useTheme();
  const navigation = useNavigation<any>();
  const db = useSQLiteContext();
  const [sessions, setSessions] = useState<LearningSession[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const monthlyGoalHours = 10;

  useEffect(() => { load(); }, []);

  async function load() {
    try {
      const rows = await db.getAllAsync<LearningSession>(
        `SELECT * FROM learning_sessions WHERE deleted_at IS NULL ORDER BY created_at DESC`
      );
      setSessions(rows);
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const hoursRow = await db.getFirstAsync<{ hours: number }>(
        `SELECT SUM(duration_minutes) / 60.0 as hours FROM learning_sessions WHERE is_completed = 1 AND created_at >= ? AND deleted_at IS NULL`,
        [startOfMonth]
      );
      setMonthlyHours(hoursRow?.hours ?? 0);
    } catch {
      setSessions([]);
    }
  }

  async function markCompleted(id: number) {
    try {
      await db.runAsync(`UPDATE learning_sessions SET is_completed = 1 WHERE id = ?`, [id]);
      await load();
    } catch (e) {
      console.warn('markCompleted error', e);
    }
  }

  async function logSession(topic: string, duration: number, notes: string) {
    try {
      await db.runAsync(
        `INSERT INTO learning_sessions (title, category, description, duration_minutes, is_completed, progress, created_at)
         VALUES (?, 'General', ?, ?, 0, 0, ?)`,
        [topic, notes, duration, new Date().toISOString()]
      );
      setShowModal(false);
      await load();
    } catch (e) {
      console.warn('logSession error', e);
    }
  }

  const filtered = selectedCategory
    ? sessions.filter((s) => s.category === selectedCategory)
    : sessions;

  const completedCount = sessions.filter((s) => s.is_completed === 1).length;
  const progress = monthlyGoalHours > 0 ? Math.min(monthlyHours / monthlyGoalHours, 1) : 0;
  const progressColor = progress >= 0.8 ? '#7BC47B' : progress >= 0.4 ? '#F5CB5C' : theme.colors.error;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <IconButton
            icon={() => <Ionicons name="arrow-back" size={24} color={theme.colors.onSurface} />}
            size={24}
            onPress={() => navigation.goBack()}
            style={{ margin: 0 }}
          />
          <View style={styles.headerCenter}>
            <Text variant="labelSmall" style={{ color: theme.colors.onSurfaceVariant }}>Growth</Text>
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface }} numberOfLines={1}>Learn</Text>
          </View>
          <View style={{ width: 44 }} />
        </View>

        <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
          {completedCount} of {sessions.length} sessions completed
        </Text>

        <GlassCard style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>Monthly Goal</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {monthlyHours.toFixed(1)} / {monthlyGoalHours} hours
            </Text>
          </View>
          <ProgressBar progress={progress} color={progressColor} />
        </GlassCard>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
          {CATEGORIES.map((cat) => {
            const active = cat === 'All' ? selectedCategory === null : selectedCategory === cat;
            return (
              <Chip
                key={cat}
                selected={active}
                onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
                style={{ backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant }}
                textStyle={{ color: active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant }}
              >
                {cat}
              </Chip>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={theme.colors.outline} />
            <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>No sessions here</Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, textAlign: 'center' }}>
              {selectedCategory ? 'Select a different category or log a new session.' : 'Log your first learning session.'}
            </Text>
          </View>
        ) : (
          filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onTap={() => {
                if (!session.is_completed) markCompleted(session.id);
              }}
            />
          ))
        )}
      </ScrollView>

      <FAB
        icon={() => <Ionicons name="add" size={22} color={theme.colors.onPrimary} />}
        style={[styles.fab, { backgroundColor: theme.colors.primary }]}
        onPress={() => setShowModal(true)}
        label="Log Session"
      />

      <LogSessionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={logSession}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  headerCenter: { flex: 1, alignItems: 'center' },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: 120, gap: spacing.base },
  goalCard: {},
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  chips: { maxHeight: 44 },
  chipsContent: { gap: spacing.sm, paddingHorizontal: spacing.screenHorizontal, paddingVertical: 4 },
  sessionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sessionMeta: { flex: 1 },
  sessionFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  fab: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing.lg,
  },
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.sm },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], padding: spacing.xl, gap: spacing.base },
  notesInput: { height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
});
