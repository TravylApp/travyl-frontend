# Travyl Code Style Guide

Zero-tolerance policy for code smells. Every number, color, and spacing value must have a name.

---

## 1. Magic Numbers — ZERO TOLERANCE

**Rule:** Any numeric literal except `0`, `1`, or `-1` must be a named constant.

**Violations:**
```tsx
// ❌ BAD — magic numbers
style={{ borderRadius: 12, padding: 28, marginBottom: 16 }}
size={16}
flex: 1
gap: 8

// ❌ BAD — hex colors in components
backgroundColor: '#1e3a5f'

// ❌ BAD — time/math constants
setTimeout(() => {}, 300)
const offset = scrollY / 100
```

**Correct:**
```tsx
// ✅ GOOD — named constants
import { SPACING } from '@travyl/shared';
import { SIZES } from '@travyl/shared';

style={{ borderRadius: SIZES.radius.md, padding: SPACING.xl, marginBottom: SPACING.md }}
size={SIZES.icon.md}
flex: SIZES.flex.fill
gap: SPACING.sm
```

---

## 2. Spacing Constants (Single Source of Truth)

All spacing values must use the shared `SPACING` scale:

```typescript
SPACING.xs   = 4
SPACING.sm   = 8
SPACING.md   = 16
SPACING.lg   = 24
SPACING.xl   = 28
SPACING['2xl'] = 32
SPACING['3xl'] = 48
```

**Exceptions:** None. If you need a custom value, add it to `SPACING` with semantic naming.

---

## 3. Sizing Constants

All component dimensions must use `SIZES`:

```typescript
// Buttons
SIZES.button.height.sm = 36
SIZES.button.height.md = 48
SIZES.button.height.lg = 56

// Icons
SIZES.icon.xs = 12
SIZES.icon.sm = 14
SIZES.icon.md = 16
SIZES.icon.lg = 20
SIZES.icon.xl = 24

// Radius
SIZES.radius.sm = 8
SIZES.radius.md = 12
SIZES.radius.lg = 16
SIZES.radius.full = 9999
```

---

## 4. Color Access

**Rule:** Never hardcode hex/RGBA in components. Always use theme tokens.

```tsx
// ❌ BAD
backgroundColor: 'rgba(30,58,95,0.1)'
color: '#ffffff'

// ✅ GOOD
import { useThemeColors } from '@/hooks/useThemeColors';
const colors = useThemeColors();

backgroundColor: colors.cardBackground
color: colors.text
```

---

## 5. TypeScript — No `any`

**Rule:** `any` type is banned. Use `unknown` with type guards or proper interfaces.

```tsx
// ❌ BAD
function handle(data: any) { ... }
iconName as any

// ✅ GOOD
function handle(data: unknown) { 
  if (typeof data === 'string') { ... }
}
iconName satisfies IconName
```

---

## 6. Console Statements

**Rule:** No `console.log/warn/error` in production code. Use proper logging or remove.

```typescript
// ❌ BAD
console.log('debug');
console.warn('warning');
console.error(error);

// ✅ GOOD
// In development only, or use a logger service
if (process.env.NODE_ENV === 'development') {
  logger.debug(...)
}
```

---

## 7. Component Patterns

**Rule:** Don't duplicate layout patterns. Use shared primitives.

```tsx
// ❌ BAD — repeated inline styles
<View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>

// ✅ GOOD — shared component
<Row align="center" gap="sm">

// ❌ BAD — inline card styles
<View style={{ borderRadius: 12, borderWidth: 1, borderColor: colors.borderLight, padding: 16 }}>

// ✅ GOOD — shared component
<Card variant="outlined" padding="md">
```

---

## 8. File Organization

```
packages/shared/src/
  constants/
    spacing.ts      # All SPACING values
    sizing.ts       # All SIZES values
    timing.ts       # Animation durations, delays
  components/
    layout/
      Row.tsx       # flexDirection: row helper
      Column.tsx    # flexDirection: column helper
      Stack.tsx     # gap-based layout
    primitives/
      Card.tsx      # Styled container
      Button.tsx    # Base button
```

---

## 9. Linting Enforcement

All rules are enforced via ESLint. CI will fail on violations.

**Enabled Rules:**
- `@typescript-eslint/no-magic-numbers` — catches literals
- `@typescript-eslint/no-explicit-any` — bans `any` type
- `no-console` — catches console statements
- `@typescript-eslint/consistent-type-imports` — enforces `import type`

---

## 10. Agent Requirements

**Before writing code:**
1. Read this file
2. Check `constants/` for existing values
3. Add new constants if your value doesn't exist
4. Never inline numeric literals

**Commit message format for lint fixes:**
```
style: extract magic numbers to constants

- Added SPACING.xl (28)
- Added SIZES.button.height.md (48)
- Refactored LoginScreen to use constants
```
