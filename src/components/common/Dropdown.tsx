import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, FlatList, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useThemeColors } from '../../hooks/useThemeColors';
import { spacing, typography, borderRadius } from '../../theme';

export interface DropdownOption {
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
  const colors = useThemeColors();
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <View style={styles.wrap}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <TouchableOpacity
        style={[styles.field, { borderColor: colors.border, backgroundColor: colors.glassWhite }]}
        onPress={() => setOpen(true)}
        activeOpacity={0.7}
      >
        <View style={styles.fieldValue}>
          {selected?.icon ? (
            <Ionicons
              name={selected.icon}
              size={18}
              color={selected.color ?? colors.accentPrimary}
              style={styles.fieldIcon}
            />
          ) : null}
          <Text
            style={[styles.fieldText, { color: selected ? colors.textPrimary : colors.textTertiary }]}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {selected?.label ?? placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={18} color={colors.textSecondary} />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={[styles.overlay, { backgroundColor: colors.glassBlack }]}>
          <View style={[styles.sheet, { backgroundColor: colors.bgSecondary }]}>
            <View style={styles.sheetHeader}>
              <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{label}</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.option, { borderBottomColor: colors.borderSubtle }]}
                    onPress={() => {
                      onChange(item.value);
                      setOpen(false);
                    }}
                  >
                    <View style={styles.optionLeft}>
                      {item.icon ? (
                        <Ionicons
                          name={item.icon}
                          size={18}
                          color={item.color ?? colors.accentPrimary}
                          style={styles.fieldIcon}
                        />
                      ) : null}
                      <Text style={[styles.optionText, { color: colors.textPrimary }]} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark" size={20} color={colors.accentPrimary} /> : null}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.base,
  },
  label: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    marginBottom: spacing.sm,
  },
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: borderRadius.lg,
    paddingHorizontal: spacing.base,
    paddingVertical: spacing.base,
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
  fieldText: {
    fontSize: typography.sizes.base,
    fontWeight: typography.weights.medium,
    flex: 1,
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
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  sheetTitle: {
    fontSize: typography.sizes.xl,
    fontWeight: typography.weights.semibold,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    borderBottomWidth: 1,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
  optionText: {
    fontSize: typography.sizes.base,
    flex: 1,
  },
});
