import { LIGHT_TOKENS } from '@travyl/shared';
import type { ThemeTokens } from '@travyl/shared';

export function useThemeColors(): ThemeTokens {
  // Default to light mode — ignore OS dark mode preference (TRA-272)
  return LIGHT_TOKENS;
}
