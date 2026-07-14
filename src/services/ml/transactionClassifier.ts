/**
 * On-device personalised transaction classifier (S6).
 *
 * Architecture:
 *   • User category corrections are captured as (feature_vector, label) rows
 *     in `ml_training_samples` (SQLite — survives process kill).
 *   • Once MIN_SAMPLES corrections exist, a CART decision tree is trained
 *     synchronously (< 50 ms on 500 rows) and the model is persisted to
 *     AsyncStorage as JSON.
 *   • At app start, `loadModel()` rehydrates the model from AsyncStorage so
 *     inference is available immediately without a DB round-trip.
 *   • `classifyTransaction()` runs inference synchronously and returns the
 *     predicted category, or null when the model is not yet ready.
 *
 * The model is 100% OTA-updateable: both the training/inference code and the
 * persisted JSON weights ship through the JS bundle / AsyncStorage — no APK
 * release is required to push improvements.
 *
 * Kotlin parity note: the Kotlin reference app has no equivalent. This is a
 * net-new capability exclusive to the RN architecture.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SQLiteDatabase } from 'expo-sqlite';
import { extractFeatures, type FeatureTx } from './featureExtractor';
import { trainTree, predictTree, type DecisionTree } from './decisionTree';

const MODEL_STORAGE_KEY = 'ml_classifier_v1';

/** Minimum corrections before the model activates. */
export const MIN_SAMPLES = 50;

/** Hard cap on training rows — keeps training time bounded. */
const MAX_TRAINING_ROWS = 2_000;

let _model: DecisionTree | null = null;
let _loadAttempted = false;

// ─── Lifecycle ────────────────────────────────────────────────────────────────

/**
 * Load the persisted model from AsyncStorage. Call once at app startup.
 * Safe to call multiple times — subsequent calls are no-ops.
 */
export async function loadModel(): Promise<void> {
  if (_loadAttempted) return;
  _loadAttempted = true;
  try {
    const raw = await AsyncStorage.getItem(MODEL_STORAGE_KEY);
    if (raw) _model = JSON.parse(raw) as DecisionTree;
  } catch {
    _model = null;
  }
}

// ─── Training data capture ────────────────────────────────────────────────────

/**
 * Record one user correction as a training sample.
 * `tx` must supply at least: amount, date, transaction_type, merchant.
 */
export async function recordCorrection(
  db: SQLiteDatabase,
  tx: FeatureTx,
  correctedCategory: string,
): Promise<void> {
  const features = extractFeatures(tx);
  await db.runAsync(
    `INSERT INTO ml_training_samples (features, label, recorded_at)
     VALUES (?, ?, datetime('now'))`,
    [JSON.stringify(features), correctedCategory],
  );
}

// ─── Training ─────────────────────────────────────────────────────────────────

/**
 * Train the model on all collected corrections and persist it.
 * Returns true when the model was (re)trained, false when too few samples.
 * Designed to be called fire-and-forget after each correction.
 */
export async function trainModel(db: SQLiteDatabase): Promise<boolean> {
  const rows = await db.getAllAsync<{ features: string; label: string }>(
    `SELECT features, label FROM ml_training_samples
     ORDER BY recorded_at DESC LIMIT ?`,
    [MAX_TRAINING_ROWS],
  );

  if (rows.length < MIN_SAMPLES) return false;

  const X = rows.map(r => JSON.parse(r.features) as number[]);
  const y = rows.map(r => r.label);

  const model = trainTree(X, y);
  _model = model;

  try {
    await AsyncStorage.setItem(MODEL_STORAGE_KEY, JSON.stringify(model));
  } catch {
    // AsyncStorage write failure is non-fatal; model still usable in-process.
  }

  return true;
}

// ─── Inference ────────────────────────────────────────────────────────────────

/**
 * Predict the category for a transaction.
 * Returns null when the model is not ready (< MIN_SAMPLES corrections).
 */
export function classifyTransaction(tx: FeatureTx): string | null {
  if (!_model) return null;
  try {
    return predictTree(_model, extractFeatures(tx));
  } catch {
    return null;
  }
}

/** True once the model has been trained and loaded. */
export function isModelReady(): boolean {
  return _model !== null;
}

/** How many training samples are stored (for display in settings/debug UI). */
export async function sampleCount(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) as n FROM ml_training_samples`,
    [],
  );
  return row?.n ?? 0;
}

/** Delete all training samples and clear the model (user-initiated reset). */
export async function resetModel(db: SQLiteDatabase): Promise<void> {
  await db.runAsync(`DELETE FROM ml_training_samples`, []);
  await AsyncStorage.removeItem(MODEL_STORAGE_KEY);
  _model = null;
  _loadAttempted = false;
}

export function _resetForTesting(): void {
  _model = null;
  _loadAttempted = false;
}
