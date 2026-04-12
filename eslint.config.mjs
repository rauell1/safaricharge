import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

// Global ignores MUST be first in flat config
const eslintConfig = [
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      "examples/**",
      "skills/**",
      // Non-Next.js directories — Zustand/Immer patterns don't fit Next.js ESLint rules
      "src/store/**",
      "src/stores/**",
      "src/simulation/**",
      "src/proxy.ts",
      "src/middleware.ts",
    ],
  },
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // TypeScript rules
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/prefer-as-const": "off",

      // React rules
      "react-hooks/exhaustive-deps": "off",
      "react-hooks/rules-of-hooks": "off",
      // react-hooks v5 strict rules — fire on valid patterns (e.g. carousel mount
      // sync via useLayoutEffect, module-scope Math.random for stable skeleton widths)
      "react-hooks/no-direct-set-state-in-use-effect": "off",
      "react-hooks/no-direct-set-state-in-use-layout-effect": "off",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react/prop-types": "off",
      "react-compiler/react-compiler": "off",

      // Next.js rules
      "@next/next/no-img-element": "off",
      "@next/next/no-html-link-for-pages": "off",

      // General JavaScript rules
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
    },
  },

  // ─── Domain Hard Boundaries (Option C) ───────────────────────────────────
  // Enforce architectural ownership rules. Violations are errors, not warnings.
  // Rule: widgets/ cannot import from energy/ or dashboard/
  {
    files: ["src/components/widgets/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/components/energy/*", "../energy/*", "../../energy/*"],
            message:
              "[Domain boundary] widgets/ must not import from energy/. " +
              "Extract shared logic to a shared/ utility or lift the dependency up.",
          },
          {
            group: ["@/components/dashboard/*", "../dashboard/*", "../../dashboard/*"],
            message:
              "[Domain boundary] widgets/ must not import from dashboard/ (deprecated shim layer). " +
              "Import from the canonical domain directly.",
          },
        ],
      }],
    },
  },

  // Rule: energy/ cannot import from dashboard/
  {
    files: ["src/components/energy/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/components/dashboard/*", "../dashboard/*", "../../dashboard/*"],
            message:
              "[Domain boundary] energy/ must not import from dashboard/ (deprecated shim layer). " +
              "Import from the canonical domain directly.",
          },
        ],
      }],
    },
  },

  // Rule: dashboard/ shims must not contain implementation logic.
  // They may only re-export from canonical domains.
  // A shim file containing JSX, hooks, or state is a violation.
  {
    files: ["src/components/dashboard/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error",
        {
          // Catches: useState, useEffect, useReducer, useCallback, useMemo, useRef, useContext
          selector: "CallExpression[callee.name=/^use[A-Z]/]",
          message:
            "[Domain boundary] dashboard/ shims must not contain hooks. " +
            "All implementation belongs in the canonical domain (energy/, widgets/, layout/, financial/).",
        },
        {
          // Catches JSX elements: <div>, <Component />, etc.
          selector: "JSXElement",
          message:
            "[Domain boundary] dashboard/ shims must not render JSX. " +
            "Shims are re-export-only. Move implementation to the canonical domain folder.",
        },
      ],
    },
  },
];

export default eslintConfig;
