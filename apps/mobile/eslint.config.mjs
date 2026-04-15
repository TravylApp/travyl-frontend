import { defineConfig, globalIgnores } from "eslint/config";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  globalIgnores([
    "node_modules/**",
    "dist/**",
    "*.d.ts",
    "expo/**",
    ".expo/**",
  ]),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        jsx: true,
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      "react-hooks": reactHooks,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // Unused variables and parameters
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],

      // NO ANY — strict type safety
      "@typescript-eslint/no-explicit-any": "error",

      // NO MAGIC NUMBERS — all literals must be named constants
      "@typescript-eslint/no-magic-numbers": ["error", {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: true,
      }],

      // NO CONSOLE in production code (allow error)
      "no-console": ["warn", { allow: ["error"] }],

      // Consistent type imports
      "@typescript-eslint/consistent-type-imports": ["warn", {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      }],

      // No unused expressions
      "@typescript-eslint/no-unused-expressions": "error",

      // Prefer const
      "prefer-const": "warn",

      // React Hooks rules
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
    },
  },
]);

export default eslintConfig;
