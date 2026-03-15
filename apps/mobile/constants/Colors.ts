import { LIGHT_TOKENS, DARK_TOKENS, Navy } from '@travyl/shared';

export default {
  light: {
    text: LIGHT_TOKENS.text,
    background: LIGHT_TOKENS.background,
    tint: LIGHT_TOKENS.tint,
    tabIconDefault: LIGHT_TOKENS.textTertiary,
    tabIconSelected: Navy.DEFAULT,
    accent: LIGHT_TOKENS.accent,
  },
  dark: {
    text: DARK_TOKENS.text,
    background: DARK_TOKENS.background,
    tint: DARK_TOKENS.tint,
    tabIconDefault: DARK_TOKENS.textTertiary,
    tabIconSelected: DARK_TOKENS.tabBarActive,
    accent: DARK_TOKENS.accent,
  },
};
