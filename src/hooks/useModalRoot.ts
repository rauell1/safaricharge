"use client"

import { useState, useEffect } from 'react'

/**
 * Returns the #modal-root DOM node after hydration.
 *
 * Radix portals default to document.body, but under Next.js App Router
 * the portal can attach to the nearest hydrated root instead, landing
 * fixed dialogs/sheets inside a constrained layout subtree.  Pointing
 * every portal at a dedicated #modal-root <div> that is the LAST child
 * of <body> (outside ALL layout wrappers) guarantees:
 *
 *  - The containing block is the true viewport (no overflow/transform parent)
 *  - The portal renders above every layout layer without z-index tricks
 *  - SSR never tries to access `document` (state starts null)
 */
export function useModalRoot(): HTMLElement | null {
  const [root, setRoot] = useState<HTMLElement | null>(null)

  useEffect(() => {
    // Only runs in the browser after hydration
    const el = document.getElementById('modal-root')
    if (el) {
      setRoot(el)
    } else {
      // Fallback: create it if layout.tsx hasn't added it yet
      const div = document.createElement('div')
      div.id = 'modal-root'
      document.body.appendChild(div)
      setRoot(div)
    }
  }, [])

  return root
}
