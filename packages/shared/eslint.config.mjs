import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import reactHooks from "eslint-plugin-react-hooks";

const eslintConfig = defineConfig([
  globalIgnores(["dist/**", "node_modules/**", "*.d.ts", "**/*.test.ts", "**/*.test.tsx"]),
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
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
      "@typescript-eslint/no-require-imports": "warn",

      // NO ANY — strict type safety
      "@typescript-eslint/no-explicit-any": "warn",

      // NO MAGIC NUMBERS — all literals must be named constants
      "@typescript-eslint/no-magic-numbers": ["warn", {
        ignore: [0, 1, -1],
        ignoreArrayIndexes: true,
        enforceConst: true,
        detectObjects: true,
      }],

      // NO CONSOLE in production code
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
    },
  },
]);

export default eslintConfig;
