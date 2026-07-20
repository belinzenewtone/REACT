import React, { useState } from 'react';
import { View, StyleSheet, Modal, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  Card,
  Text,
  Button,
  TouchableRipple,
  useTheme,
} from 'react-native-paper';
import { spacing, borderRadius } from '../../theme';

interface DropdownOption {
  value: string;
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface DropdownProps {
  label: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
}

/** Boxed field that opens a bottom-sheet list — replaces pill/segment rows that would otherwise wrap across multiple lines. */
export function Dropdown({ label, value, options, onChange, placeholder = 'Select…' }: DropdownProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
        {label}
      </Text>
      <TouchableRipple
        onPress={() => setOpen(true)}
        style={[styles.field, { borderColor: theme.colors.outlineVariant }]}
      >
        <View style={styles.fieldContent}>
          <View style={styles.fieldValue}>
            {selected?.icon ? (
              <Ionicons
                name={selected.icon}
                size={18}
                color={selected.color ?? theme.colors.primary}
                style={styles.fieldIcon}
              />
            ) : null}
            <Text
              variant="bodyMedium"
              style={{ color: selected ? theme.colors.onSurface : theme.colors.onSurfaceVariant }}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {selected?.label ?? placeholder}
            </Text>
          </View>
          <Ionicons name="chevron-down" size={18} color={theme.colors.onSurfaceVariant} />
        </View>
      </TouchableRipple>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.6)' }]}>
          <Card style={[styles.sheet, { backgroundColor: theme.colors.surfaceVariant }]} mode="elevated">
            <Card.Content>
              <View style={styles.sheetHeader}>
                <Text variant="titleLarge" style={{ color: theme.colors.onSurface }}>{label}</Text>
                <Button
                  mode="text"
                  compact
                  onPress={() => setOpen(false)}
                  textColor={theme.colors.onSurfaceVariant}
                >
                  Close
                </Button>
              </View>
              <ScrollView style={styles.optionsScroll}>
                {options.map((item) => {
                  const isSelected = item.value === value;
                  return (
                    <TouchableRipple
                      key={item.value}
                      onPress={() => {
                        onChange(item.value);
                        setOpen(false);
                      }}
                      style={[styles.option, { borderBottomColor: theme.colors.outlineVariant }]}
                    >
                      <View style={styles.optionContent}>
                        <View style={styles.optionLeft}>
                          {item.icon ? (
                            <Ionicons
                              name={item.icon}
                              size={18}
                              color={item.color ?? theme.colors.primary}
                              style={styles.fieldIcon}
                            />
                          ) : null}
                          <Text
                            variant="bodyMedium"
                            style={{ color: theme.colors.onSurface }}
                            numberOfLines={1}
                          >
                            {item.label}
                          </Text>
                        </View>
                        {isSelected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
                      </View>
                    </TouchableRipple>
                  );
                })}
              </ScrollView>
            </Card.Content>
          </Card>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.base,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
  },
  fieldContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fieldValue: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  fieldIcon: {
    marginRight: spacing.sm,
  },
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: borderRadius['2xl'],
    borderTopRightRadius: borderRadius['2xl'],
    padding: spacing.lg,
    maxHeight: '70%',
  },
  optionsScroll: {
    maxHeight: 360,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  option: {
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
});
