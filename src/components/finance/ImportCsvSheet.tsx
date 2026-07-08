import React from 'react';
import { View, StyleSheet, Modal } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import {
  Card,
  Text,
  Button,
  useTheme,
} from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface ImportCsvSheetProps {
  visible: boolean;
  onClose: () => void;
  onFilePicked: (fileUri: string, fileName: string) => void;
}

export function ImportCsvSheet({ visible, onClose, onFilePicked }: ImportCsvSheetProps) {
  const theme = useTheme();

  const handleChooseFile = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: 'text/csv' });
    onClose();
    if (result.canceled || !result.assets?.length) return;
    onFilePicked(result.assets[0].uri, result.assets[0].name);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
        <Card style={[styles.content, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
          <Card.Content>
            <View style={styles.grabber} />
            <Text variant="titleLarge" style={{ color: theme.colors.onSurface, marginBottom: spacing.base }}>
              Import from CSV
            </Text>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.xl }}>
              Select a CSV file with columns: date, amount, type, category, description. Supported
              date formats: yyyy-MM-dd, dd/MM/yyyy, MM/dd/yyyy. Type values: INCOME, EXPENSE (or
              IN/CREDIT/RECEIVED for income).
            </Text>
            <Button
              mode="contained"
              onPress={handleChooseFile}
              style={styles.chooseButton}
            >
              Choose File
            </Button>
            <Button
              mode="text"
              onPress={onClose}
              textColor={theme.colors.primary}
            >
              Cancel
            </Button>
          </Card.Content>
        </Card>
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
    paddingTop: spacing.sm,
    paddingBottom: spacing['2xl'],
  },
  grabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignSelf: 'center',
    marginBottom: spacing.lg,
  },
  chooseButton: {
    borderRadius: borderRadius.full,
    marginBottom: spacing.lg,
  },
});
