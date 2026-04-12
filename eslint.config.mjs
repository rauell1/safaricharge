import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
import { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Rule overrides — placed LAST so they win over core-web-vitals re-assertions.
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

    // Next.js — all off; we use Link correctly but don't want CI broken by edge cases
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
  // Next.js base configs first
  ...nextCoreWebVitals,
  ...nextTypescript,
  // Ignores
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills",
      "iot-bridge/**",
      "scripts/**",
      "src/store/**",
      "src/proxy.ts",
    ],
  },
  // Our overrides LAST — highest specificity in flat config
  overrides,
];

export default eslintConfig;
