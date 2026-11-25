/** Critically balanced Apple spring preset for surfaces and cards. */
export const APPLE_SPRING = {
  type: 'spring' as const,
  stiffness: 380,
  damping: 32,
}

/** Snappy Apple spring preset for micro-interactions and controls. */
export const APPLE_FAST_SPRING = {
  type: 'spring' as const,
  stiffness: 500,
  damping: 36,
}

/** Returns Framer Motion props for bottom sheets on mobile and centered modals on desktop. */
export function getSheetMotionProps(
  shouldReduceMotion: boolean,
  isDesktop: boolean,
) {
  if (shouldReduceMotion) {
    return {
      initial: { opacity: 0 },
      animate: { opacity: 1 },
      exit: { opacity: 0 },
      transition: { duration: 0 },
    }
  }

  if (isDesktop) {
    return {
      initial: { opacity: 0, y: 16, scale: 0.98 },
      animate: { opacity: 1, y: 0, scale: 1 },
      exit: { opacity: 0, y: 12, scale: 0.98 },
      transition: APPLE_SPRING,
    }
  }

  return {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: APPLE_SPRING,
  }
}
