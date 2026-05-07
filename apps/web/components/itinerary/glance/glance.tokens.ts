/** Spacing/typography constants for the At-a-Glance Day Slide. */
export const GLANCE_TOKENS = {
  slide: {
    maxWidth: 1480,
    minHeight: 580,
    gridCols: '1fr 1.25fr',
    stackBreakpoint: 1024,
  },
  panel: {
    paddingDesktop: '48px 52px 44px',
    paddingMobile: '36px 32px',
  },
  moment: {
    gridCols: '110px 1fr auto',
    gapDesktop: 16,
  },
  pip: {
    heightDefault: 5,
    heightActive: 7,
    minWidth: 14,
    maxWidth: 60,
  },
} as const;
