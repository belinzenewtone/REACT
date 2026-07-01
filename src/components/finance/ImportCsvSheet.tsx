import React from 'react';
import { View, Text, TouchableOpacity, Modal, StyleSheet } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

interface ImportCsvSheetProps {
  visible: boolean;
  onClose: () => void;
  onFilePicked: (fileUri: string, fileName: string) => void;
}

export function ImportCsvSheet({ visible, onClose, onFilePicked }: ImportCsvSheetProps) {
  const colors = useThemeColors();

  const handleChooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
    onClose();
    if (result.canceled || !result.assets?.length) return;
    onFilePicked(result.assets[0].uri, result.assets[0].name);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: colors.glassBlack }]}>
        <View style={[styles.content, { backgroundColor: colors.bgSecondary }]}>
          <View style={styles.grabber} />
          <Text style={[styles.title, { color: colors.textPrimary }]}>Import from CSV</Text>
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            Select a CSV file with columns: date, amount, type, category, description. Supported
            date formats: yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy. Type values: INCOME, EXPENSE (or
            IN/CREDIT/RECEIVED for income).
          </Text>
          <TouchableOpacity
            style={[styles.chooseButton, { backgroundColor: colors.accentPrimary }]}
            onPress={handleChooseFile}
          >
            <Text style={[styles.chooseButtonText, { color: colors.textInverse }]}>Choose File</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={[styles.cancelText, { color: colors.accentPrimary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  content: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
    alignItems: 'center',
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
    alignSelf: 'flex-start',
    marginBottom: spacing.base,
  },
  description: {
    fontSize: typography.sizes.sm,
    lineHeight: typography.sizes.sm * 1.5,
    alignSelf: 'flex-start',
    marginBottom: spacing.xl,
  },
  chooseButton: {
    width: '100%',
    paddingVertical: spacing.base,
    borderRadius: borderRadius.full,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  chooseButtonText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.semibold,
  },
  cancelButton: {
    paddingVertical: spacing.sm,
  },
  cancelText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
  },
});
