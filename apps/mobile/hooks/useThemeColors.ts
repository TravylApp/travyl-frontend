import { useColorScheme } from 'react-native';
import { LIGHT_TOKENS, DARK_TOKENS } from '@travyl/shared';
import type { ThemeTokens } from '@travyl/shared';

export function useThemeColors(): ThemeTokens {
  const scheme = useColorScheme();
  return scheme === 'dark' ? DARK_TOKENS : LIGHT_TOKENS;
}
