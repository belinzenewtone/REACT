import { LayoutAnimation, InteractionManager } from 'react-native';
import { motion } from '../theme';

/**
 * Animates the next layout change (item insert/remove, size/visibility change).
 * Deferred via InteractionManager so it never competes with an ongoing navigation
 * transition, which is the main cause of jank when animating list mutations.
 *
 * Pass `immediate = true` in contexts where you know no navigation is in flight.
 */
export function animateLayout(durationMs: number = motion.standard, immediate = false) {
  const run = () => {
    LayoutAnimation.configureNext({
      duration: durationMs,
      create: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
      update: {
        type: LayoutAnimation.Types.spring,
        springDamping: 0.85,
      },
      delete: {
        type: LayoutAnimation.Types.easeInEaseOut,
        property: LayoutAnimation.Properties.opacity,
      },
    });
  };

  if (immediate) {
    run();
  } else {
    InteractionManager.runAfterInteractions(run);
  }
}
