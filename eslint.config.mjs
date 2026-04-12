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

  // ─── Domain Hard Boundaries (Option C) ───────────────────────────────────
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
              "[Domain boundary] energy/ cannot import from dashboard/ (deprecated shim layer). " +
              "Import from the canonical domain directly.",
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

  // ─── Post-Deletion Resurrection Guard ────────────────────────────────────
  //
  // CURRENT STATE: 'warn'
  // This rule is intentionally set to 'warn' while dashboard/ shims still exist.
  // They are excluded from the domain boundary rules above, but this global rule
  // would fire on the shims themselves if set to 'error' now.
  //
  // ACTION REQUIRED after migration:
  //   1. Run: git rm -r src/components/dashboard/
  //   2. Change 'warn' → 'error' in this block
  //   3. Run: npm run lint && npm run build
  //   4. Commit with message: "arch: activate resurrection guard after dashboard/ deletion"
  //
  // What this prevents permanently:
  //   - No developer can ever re-introduce @/components/dashboard/* imports
  //   - CI will fail immediately if the old path appears anywhere in the codebase
  //   - Protects the domain-driven architecture from architectural drift
  {
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      // While shims exist, exclude them from this global rule to avoid self-referential errors.
      // Remove this ignore block after deleting src/components/dashboard/.
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
                "See CODEBASE_MAP.md for the full component-to-domain map.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
