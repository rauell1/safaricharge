import fs from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const REPO_ROOT = process.cwd()

const PORTAL_FILES = [
  "src/components/ui/dialog.tsx",
  "src/components/ui/alert-dialog.tsx",
  "src/components/ui/sheet.tsx",
  "src/components/ui/drawer.tsx",
] as const

describe("portal container rule", () => {
  for (const relPath of PORTAL_FILES) {
    it(`${relPath} mounts portals to #modal-root`, () => {
      const source = fs.readFileSync(path.join(REPO_ROOT, relPath), "utf8")
      expect(source).toContain('useModalRoot')
      expect(source).toContain("const modalRoot = useModalRoot()")
      expect(source).toContain("const container = containerProp ?? modalRoot ?? undefined")
      expect(source).toMatch(/container=\{container\}/)
    })
  }
})
