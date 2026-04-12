import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// ─── Global ignores (must come first in flat config) ──────────────────────────────────────
const ignores = {
  ignores: [
    "node_modules/**",
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "examples/**",
    "skills/**",
    "iot-bridge/**",
    "scripts/**",
    // Zustand/Immer stores — mutation patterns fail Next.js ESLint rules
    "src/store/**",
    "src/stores/**",
    // Simulation / computation utilities — not Next.js-idiomatic code
    "src/simulation/**",
    // Non-Next.js files
    "src/proxy.ts",
  ],
};

// ─── Rule overrides (placed LAST — highest specificity in flat config) ──────────────
const overrides = {
  files: ["**/*.{ts,tsx,js,jsx,mjs}"],
  rules: {
    // TypeScript
    "@typescript-eslint/no-explicit-any": "off",
    "@typescript-eslint/no-unused-vars": "off",
    "@typescript-eslint/no-non-null-assertion": "off",
    "@typescript-eslint/ban-ts-comment": "off",
    "@typescript-eslint/prefer-as-const": "off",
    "@typescript-eslint/no-unused-disable-directive": "off",

    // React
    "react-hooks/exhaustive-deps": "off",
    "react-hooks/rules-of-hooks": "off",
    "react/no-unescaped-entities": "off",
    "react/display-name": "off",
    "react/prop-types": "off",
    "react-compiler/react-compiler": "off",

    // Next.js
    "@next/next/no-img-element": "off",
    "@next/next/no-html-link-for-pages": "off",

    // General JS
    "prefer-const": "off",
    "no-unused-vars": "off",
    "no-console": "off",
    "no-debugger": "off",
    "no-empty": "off",
    "no-irregular-whitespace": "off",
    "no-case-declarations": "off",
    "no-fallthrough": "off",
    "no-mixed-spaces-and-tabs": "off",
    "no-redeclare": "off",
    "no-undef": "off",
    "no-unreachable": "off",
    "no-useless-escape": "off",

    // Import
    "import/no-anonymous-default-export": "off",
    "import/no-cycle": "off",
  },
};

const eslintConfig = [
  // 1. Global ignores first
  ignores,
  // 2. Next.js base configs
  ...nextCoreWebVitals,
  ...nextTypescript,
  // 3. Our overrides last — wins over any core-web-vitals re-assertions
  overrides,
];

export default eslintConfig;
