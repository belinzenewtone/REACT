import { LayoutAnimation } from 'react-native';
import { motion } from '../theme';

/**
 * Animates the next layout change (item insert/remove, size/visibility change) with a
 * consistent, subtle ease matching the app's standard motion timing. Call right before the
 * state update that triggers the layout change.
 */
export function animateLayout(durationMs: number = motion.standard) {
  LayoutAnimation.configureNext({
    duration: durationMs,
    create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
    update: { type: LayoutAnimation.Types.easeInEaseOut },
    delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  });
}
