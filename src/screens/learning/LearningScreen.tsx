import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSQLiteContext } from 'expo-sqlite';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';
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

function ProgressBar({ progress, color, colors }: { progress: number; color: string; colors: any }) {
  return (
    <View style={[styles.progressTrack, { backgroundColor: colors.bgTertiary }]}>
      <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%`, backgroundColor: color }]} />
    </View>
  );
}

function SessionCard({ session, onTap, colors }: { session: LearningSession; onTap: () => void; colors: any }) {
  const isCompleted = session.is_completed === 1;
  return (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: colors.bgSecondary, borderColor: colors.border }]}
      onPress={onTap}
      activeOpacity={0.8}
    >
      <View style={styles.sessionTop}>
        <View style={styles.sessionMeta}>
          <Text style={[styles.sessionCategory, { color: colors.accentPrimary }]}>{session.category}</Text>
          <Text style={[styles.sessionTitle, { color: colors.textPrimary }]}>{session.title}</Text>
        </View>
        {isCompleted && (
          <Ionicons name="checkmark-circle" size={22} color={colors.success} />
        )}
      </View>

      {session.description ? (
        <Text style={[styles.sessionDesc, { color: colors.textSecondary }]} numberOfLines={2}>
          {session.description}
        </Text>
      ) : null}

      <View style={styles.sessionFooter}>
        <Ionicons name="timer-outline" size={13} color={colors.textTertiary} />
        <Text style={[styles.sessionDuration, { color: colors.textSecondary }]}>
          {session.duration_minutes} min
        </Text>
      </View>

      {session.progress > 0 && !isCompleted && (
        <ProgressBar progress={session.progress} color={colors.accentPrimary} colors={colors} />
      )}

      {!isCompleted && (
        <View style={[styles.startChip, { backgroundColor: `${colors.accentPrimary}18` }]}>
          <Text style={[styles.startChipText, { color: colors.accentPrimary }]}>
            {session.progress > 0 ? 'Continue' : 'Start'}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

function LogSessionModal({
  visible,
  onClose,
  onSave,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (topic: string, duration: number, notes: string) => void;
  colors: any;
}) {
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
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={[styles.modalSheet, { backgroundColor: colors.bgSecondary }]}>
          <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Log Learning Session</Text>

          <TextInput
            style={[styles.input, { borderColor: errors.topic ? colors.danger : colors.border, color: colors.textPrimary, backgroundColor: colors.bgTertiary }]}
            placeholder="Topic (e.g. Kotlin Coroutines)"
            placeholderTextColor={colors.textTertiary}
            value={topic}
            onChangeText={(v) => { setTopic(v); setErrors((e) => ({ ...e, topic: false })); }}
          />
          <TextInput
            style={[styles.input, { borderColor: errors.duration ? colors.danger : colors.border, color: colors.textPrimary, backgroundColor: colors.bgTertiary }]}
            placeholder="Duration (minutes)"
            placeholderTextColor={colors.textTertiary}
            value={duration}
            onChangeText={(v) => { setDuration(v); setErrors((e) => ({ ...e, duration: false })); }}
            keyboardType="number-pad"
          />
          <TextInput
            style={[styles.input, styles.notesInput, { borderColor: colors.border, color: colors.textPrimary, backgroundColor: colors.bgTertiary }]}
            placeholder="Notes (optional)"
            placeholderTextColor={colors.textTertiary}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: colors.border }]} onPress={onClose}>
              <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalBtn, { backgroundColor: colors.accentPrimary, borderColor: colors.accentPrimary }]} onPress={handleSave}>
              <Text style={[styles.modalBtnText, { color: colors.textInverse }]}>Log</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

export function LearningScreen() {
  const colors = useThemeColors();
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
  const progressColor = progress >= 0.8 ? colors.success : progress >= 0.4 ? colors.warning : colors.danger;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.bgPrimary }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>Growth</Text>
            <Text style={[styles.title, { color: colors.textPrimary }]}>Learn</Text>
          </View>
          <View style={{ width: 24 }} />
        </View>

        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          {completedCount} of {sessions.length} sessions completed
        </Text>

        {/* Monthly Goal */}
        <GlassCard style={styles.goalCard}>
          <View style={styles.goalHeader}>
            <Text style={[styles.goalLabel, { color: colors.textPrimary }]}>Monthly Goal</Text>
            <Text style={[styles.goalProgress, { color: colors.textSecondary }]}>
              {monthlyHours.toFixed(1)} / {monthlyGoalHours} hours
            </Text>
          </View>
          <ProgressBar progress={progress} color={progressColor} colors={colors} />
        </GlassCard>

        {/* Category chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chips} contentContainerStyle={styles.chipsContent}>
          {CATEGORIES.map((cat) => {
            const active = cat === 'All' ? selectedCategory === null : selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, { backgroundColor: active ? colors.accentPrimary : colors.bgTertiary }]}
                onPress={() => setSelectedCategory(cat === 'All' ? null : cat)}
              >
                <Text style={[styles.chipText, { color: active ? colors.textInverse : colors.textSecondary }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={48} color={colors.textTertiary} />
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No sessions here</Text>
            <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
              {selectedCategory ? 'Select a different category or log a new session.' : 'Log your first learning session.'}
            </Text>
          </View>
        ) : (
          filtered.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              colors={colors}
              onTap={() => {
                if (!session.is_completed) markCompleted(session.id);
              }}
            />
          ))
        )}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accentPrimary }]}
        onPress={() => setShowModal(true)}
      >
        <Ionicons name="add" size={22} color={colors.textInverse} />
        <Text style={[styles.fabText, { color: colors.textInverse }]}>Log Session</Text>
      </TouchableOpacity>

      <LogSessionModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        onSave={logSession}
        colors={colors}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium },
  title: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  subtitle: { fontSize: typography.sizes.sm, marginBottom: spacing.sm },
  content: { paddingHorizontal: spacing.screenHorizontal, paddingVertical: spacing.lg, paddingBottom: 120, gap: spacing.base },
  goalCard: {},
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
  goalLabel: { fontSize: typography.sizes.sm, fontWeight: typography.weights.semibold },
  goalProgress: { fontSize: typography.sizes.sm },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },
  chips: { maxHeight: 44 },
  chipsContent: { gap: spacing.sm, paddingHorizontal: spacing.screenHorizontal, paddingVertical: 4 },
  chip: { paddingHorizontal: spacing.base, paddingVertical: spacing.xs, borderRadius: borderRadius.full },
  chipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  sessionCard: { borderRadius: borderRadius.lg, borderWidth: 1, padding: spacing.base, gap: spacing.sm },
  sessionTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  sessionMeta: { flex: 1 },
  sessionCategory: { fontSize: typography.sizes.xs, fontWeight: typography.weights.medium, marginBottom: 2 },
  sessionTitle: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  sessionDesc: { fontSize: typography.sizes.sm, lineHeight: typography.sizes.sm * 1.5 },
  sessionFooter: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sessionDuration: { fontSize: typography.sizes.xs },
  startChip: { alignSelf: 'flex-start', paddingHorizontal: spacing.base, paddingVertical: 4, borderRadius: borderRadius.sm },
  startChipText: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium },
  fab: {
    position: 'absolute',
    bottom: spacing['2xl'],
    right: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.screenHorizontal,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.full,
    gap: spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  fabText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
  emptyState: { alignItems: 'center', paddingVertical: spacing['2xl'], gap: spacing.sm },
  emptyTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.semibold },
  emptyDesc: { fontSize: typography.sizes.sm, textAlign: 'center' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: borderRadius['2xl'], borderTopRightRadius: borderRadius['2xl'], padding: spacing.xl, gap: spacing.base },
  modalTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.bold },
  input: { borderWidth: 1, borderRadius: borderRadius.full, paddingHorizontal: spacing.base, paddingVertical: spacing.sm, fontSize: typography.sizes.base },
  notesInput: { borderRadius: borderRadius.lg, height: 80, paddingTop: spacing.sm, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: spacing.sm },
  modalBtn: { flex: 1, borderWidth: 1, borderRadius: borderRadius.full, paddingVertical: spacing.sm, alignItems: 'center' },
  modalBtnText: { fontSize: typography.sizes.base, fontWeight: typography.weights.semibold },
});
