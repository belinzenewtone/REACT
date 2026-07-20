import React, { useState, useRef } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Text, TouchableRipple, useTheme } from 'react-native-paper';
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

const ITEM_HEIGHT = 52;

/** Boxed field that expands an inline panel directly below the trigger — no bottom-sheet modal. */
export function Dropdown({ label, value, options, onChange, placeholder = 'Select…' }: DropdownProps) {
  const theme = useTheme();
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const selected = options.find((o) => o.value === value);
  const sheetHeight = Math.min(options.length * ITEM_HEIGHT, 280);

  const openPanel = () => {
    setOpen(true);
    Animated.parallel([
      Animated.spring(heightAnim, { toValue: sheetHeight, useNativeDriver: false, bounciness: 4, speed: 14 }),
      Animated.timing(opacityAnim, { toValue: 1, duration: 160, useNativeDriver: false }),
      Animated.timing(rotateAnim, { toValue: 1, duration: 200, useNativeDriver: true }),
    ]).start();
  };

  const closePanel = () => {
    Animated.parallel([
      Animated.timing(heightAnim, { toValue: 0, duration: 180, useNativeDriver: false }),
      Animated.timing(opacityAnim, { toValue: 0, duration: 150, useNativeDriver: false }),
      Animated.timing(rotateAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
    ]).start(() => setOpen(false));
  };

  const handleSelect = (v: string) => {
    onChange(v);
    closePanel();
  };

  const chevronRotation = rotateAnim.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });

  return (
    <View style={styles.wrap}>
      <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant, marginBottom: spacing.sm }}>
        {label}
      </Text>

      <TouchableRipple
        onPress={open ? closePanel : openPanel}
        style={[
          styles.field,
          {
            borderColor: open ? theme.colors.primary : theme.colors.outlineVariant,
            borderBottomLeftRadius: open ? 0 : borderRadius.lg,
            borderBottomRightRadius: open ? 0 : borderRadius.lg,
          },
        ]}
      >
        <View style={styles.fieldContent}>
          <View style={styles.fieldValue}>
            {selected?.icon ? (
              <Ionicons name={selected.icon} size={18} color={selected.color ?? theme.colors.primary} style={styles.fieldIcon} />
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
          <Animated.View style={{ transform: [{ rotate: chevronRotation }] }}>
            <Ionicons name="chevron-down" size={18} color={open ? theme.colors.primary : theme.colors.onSurfaceVariant} />
          </Animated.View>
        </View>
      </TouchableRipple>

      <View style={styles.panelClip}>
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderColor: theme.colors.primary,
              maxHeight: heightAnim,
              opacity: opacityAnim,
            },
          ]}
        >
          <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
            {options.map((item) => {
              const isSelected = item.value === value;
              return (
                <TouchableRipple
                  key={item.value}
                  onPress={() => handleSelect(item.value)}
                  style={[styles.option, { borderBottomColor: theme.colors.outlineVariant }]}
                >
                  <View style={styles.optionContent}>
                    <View style={styles.optionLeft}>
                      {item.icon ? (
                        <Ionicons name={item.icon} size={18} color={item.color ?? theme.colors.primary} style={styles.fieldIcon} />
                      ) : null}
                      <Text variant="bodyMedium" style={{ color: theme.colors.onSurface }} numberOfLines={1}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected ? <Ionicons name="checkmark" size={20} color={theme.colors.primary} /> : null}
                  </View>
                </TouchableRipple>
              );
            })}
          </ScrollView>
        </Animated.View>
      </View>
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
  panelClip: {
    overflow: 'hidden',
  },
  panel: {
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: borderRadius.lg,
    borderBottomRightRadius: borderRadius.lg,
    overflow: 'hidden',
  },
  option: {
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.base,
    paddingHorizontal: spacing.base,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: spacing.sm,
  },
});
