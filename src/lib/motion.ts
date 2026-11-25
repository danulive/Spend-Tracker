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
