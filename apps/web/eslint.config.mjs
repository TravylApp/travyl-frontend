import { defineConfig, globalIgnores } from "eslint/config";
import { FlatCompat } from "@eslint/eslintrc";
import path from "node:path";
import { fileURLToPath } from "node:url";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  ...compat.extends("next/core-web-vitals"),
  ...compat.extends("next/typescript"),
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
    },
    rules: {
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

      // Prefer const
      "prefer-const": "warn",
    },
  },
]);

export default eslintConfig;
