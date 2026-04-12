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

  // ─── Domain Hard Boundaries ───────────────────────────────────────────
  // Canonical ownership rules. See COMPONENT_OWNERSHIP.md for the full map.

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
              "Extract shared logic to a shared/ utility or lift the dependency up. " +
              "See COMPONENT_OWNERSHIP.md.",
          },
          {
            group: ["@/components/dashboard/*", "../dashboard/*", "../../dashboard/*"],
            message:
              "[Domain boundary] widgets/ must not import from dashboard/ (deprecated shim layer). " +
              "Import from the canonical domain directly. See COMPONENT_OWNERSHIP.md.",
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
              "[Domain boundary] energy/ cannot import from dashboard/ (deprecated shim layer). " +
              "Import from the canonical domain directly. See COMPONENT_OWNERSHIP.md.",
          },
        ],
      }],
    },
  },

  // Rule: dashboard/ shims must not contain implementation logic.
  {
    files: ["src/components/dashboard/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error",
        {
          selector: "CallExpression[callee.name=/^use[A-Z]/]",
          message:
            "[Domain boundary] dashboard/ shims must not contain hooks. " +
            "All implementation belongs in the canonical domain folder.",
        },
        {
          selector: "JSXElement",
          message:
            "[Domain boundary] dashboard/ shims must not render JSX. " +
            "Shims are re-export-only. Move implementation to the canonical domain folder.",
        },
      ],
    },
  },

  // ─── No-Barrel Reintroduction Guard ───────────────────────────────────────
  //
  // Prevents someone from creating a new @/components/index.ts or
  // @/components/[domain]/index.ts barrel that re-introduces cross-domain
  // leakage and defeats tree-shaking. Import from individual files only.
  //
  // Good:  import { BatteryHealthCard } from '@/components/energy/BatteryHealthCard'
  // Bad:   import { BatteryHealthCard } from '@/components/energy'
  // Bad:   import { BatteryHealthCard } from '@/components'
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // Shim barrel index is the one legitimate barrel in the codebase —
      // it exists only while dashboard/ migration is in progress.
      "src/components/dashboard/**",
    ],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          {
            group: ["@/components/*/index", "@/components/*/index.ts", "@/components/*/index.tsx"],
            message:
              "[No-barrel rule] Import from individual files, not barrel index files. " +
              "Example: '@/components/energy/BatteryHealthCard' not '@/components/energy/index'. " +
              "See COMPONENT_OWNERSHIP.md.",
          },
          {
            group: ["@/components/index", "@/components/index.ts", "@/components/index.tsx"],
            message:
              "[No-barrel rule] A global @/components/index barrel is forbidden. " +
              "Import from individual domain files. See COMPONENT_OWNERSHIP.md.",
          },
        ],
      }],
    },
  },

  // ─── Post-Deletion Resurrection Guard ────────────────────────────────────
  //
  // CURRENT STATE: 'warn'
  // ─────────────────────
  // ACTION REQUIRED after migration is complete:
  //   1. git rm -r src/components/dashboard/
  //   2. Change 'warn' → 'error' on the line marked below
  //   3. Remove the ignores block inside this rule
  //   4. npm run lint && npm run build
  //   5. git commit -m "arch: activate resurrection guard after dashboard/ deletion"
  //
  // What it prevents permanently:
  //   Anyone re-introducing @/components/dashboard/* will get a CI error:
  //   "[Resurrection guard] @/components/dashboard/ has been deleted.
  //    See COMPONENT_OWNERSHIP.md for the canonical import path."
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // Remove this block after deleting src/components/dashboard/
      "src/components/dashboard/**",
    ],
    rules: {
      "no-restricted-imports": [
        // ↓↓↓ FLIP THIS TO 'error' AFTER DELETING src/components/dashboard/ ↓↓↓
        "warn",
        {
          patterns: [
            {
              group: ["@/components/dashboard", "@/components/dashboard/*"],
              message:
                "[Resurrection guard] @/components/dashboard/ has been deleted. " +
                "Import from the canonical domain: energy/, widgets/, layout/, or financial/. " +
                "See COMPONENT_OWNERSHIP.md for the full component-to-domain map.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
