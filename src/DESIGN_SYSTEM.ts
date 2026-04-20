// UI Design System & Component Architecture
// ─────────────────────────────────────────────────────────────────────────
//
// This guide ensures consistent visual design and component usage across
// all dashboard pages for a cohesive user experience.
//
// LAST UPDATED: Current Session
// STATUS: Foundation components available; pages being updated progressively

// ═════════════════════════════════════════════════════════════════════════
// 1. SPACING SYSTEM
// ═════════════════════════════════════════════════════════════════════════

const SPACING = {
  // Page-level padding
  PAGE_PADDING_SM: 'px-4 py-4 md:px-6 md:py-6',
  PAGE_PADDING_MD: 'px-4 py-6 md:px-8 md:py-8',
  PAGE_PADDING_LG: 'px-6 py-8 md:px-12 md:py-12',

  // Component gaps
  GAP_SM: 'gap-3 md:gap-4',
  GAP_MD: 'gap-4 md:gap-6',
  GAP_LG: 'gap-6 md:gap-8',

  // Grid columns
  GRID_2COL: 'grid-cols-1 md:grid-cols-2',
  GRID_3COL: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
  GRID_4COL: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',

  // Section margins
  SECTION_BOTTOM: 'mb-8',
} as const;

// ═════════════════════════════════════════════════════════════════════════
// 2. COMPONENT HIERARCHY
// ═════════════════════════════════════════════════════════════════════════

// PageContainer
// ├─ SectionHeader
// │  ├─ Icon (optional)
// │  ├─ Title
// │  ├─ Description (optional)
// │  └─ Actions (optional)
// │
// ├─ ContentGrid
// │  ├─ DashboardCard
// │  │  ├─ Header (optional)
// │  │  ├─ Title (optional)
// │  │  ├─ Icon (optional)
// │  │  └─ Content
// │  │
// │  └─ FormSection
// │     ├─ Title (optional)
// │     ├─ Description (optional)
// │     └─ Form Fields

// ═════════════════════════════════════════════════════════════════════════
// 3. COMPONENT USAGE PATTERNS
// ═════════════════════════════════════════════════════════════════════════

/**
 * BASIC PAGE LAYOUT PATTERN
 * 
 * Use this pattern for all dashboard pages to ensure consistency
 */

// Example implementation:
// 
// import { PageContainer, SectionHeader, ContentGrid } from '@/components/layout/PageContainer';
// import { DashboardCard, DashboardGrid } from '@/components/layout/DashboardCard';
//
// export default function MyPage() {
//   return (
//     <PageContainer maxWidth="lg" padding="md">
//       <div className="space-y-8">
//         {/* Header section */}
//         <SectionHeader
//           title="Page Title"
//           description="Descriptive subtitle"
//           icon={<IconComponent />}
//           actions={<Button>Action</Button>}
//         />
//
//         {/* Content grid */}
//         <DashboardGrid columns={3} gap="md">
//           <DashboardCard
//             title="Card Title"
//             icon={<IconComponent />}
//             spacing="md"
//           >
//             {/* Card content */}
//           </DashboardCard>
//         </DashboardGrid>
//       </div>
//     </PageContainer>
//   );
// }

// ═════════════════════════════════════════════════════════════════════════
// 4. COLOR TOKENS
// ═════════════════════════════════════════════════════════════════════════

const COLORS = {
  // Text colors (use CSS vars for consistency)
  TEXT_PRIMARY: 'var(--text-primary)',
  TEXT_SECONDARY: 'var(--text-secondary)',
  TEXT_TERTIARY: 'var(--text-tertiary)',

  // System colors
  SOLAR: 'var(--solar)',
  BATTERY: 'var(--battery)',
  GRID: 'var(--grid)',
  CONSUMPTION: 'var(--consumption)',

  // Background colors
  BG_PRIMARY: 'var(--bg-primary)',
  BG_CARD: 'var(--bg-card)',
  BG_CARD_MUTED: 'var(--bg-card-muted)',

  // Semantic colors
  ALERT: 'var(--alert)',
  SUCCESS: 'var(--battery)',
  WARNING: 'var(--solar)',
} as const;

// ═════════════════════════════════════════════════════════════════════════
// 5. TYPOGRAPHY HIERARCHY
// ═════════════════════════════════════════════════════════════════════════

const TYPOGRAPHY = {
  // Page title
  PAGE_TITLE: 'text-3xl md:text-4xl font-bold',

  // Section title
  SECTION_TITLE: 'text-2xl md:text-3xl font-semibold',

  // Card title
  CARD_TITLE: 'text-sm font-semibold',

  // Subtitle
  SUBTITLE: 'text-base text-[var(--text-secondary)]',

  // Body text
  BODY_SM: 'text-sm text-[var(--text-secondary)]',
  BODY_BASE: 'text-base text-[var(--text-secondary)]',

  // Small caps
  LABEL: 'text-xs font-semibold uppercase tracking-wider text-[var(--text-tertiary)]',
} as const;

// ═════════════════════════════════════════════════════════════════════════
// 6. RESPONSIVE BREAKPOINTS
// ═════════════════════════════════════════════════════════════════════════

// Mobile-first approach using Tailwind breakpoints:
// sm: 640px   (small devices)
// md: 768px   (tablets, small desktops)
// lg: 1024px  (desktops)
// xl: 1280px  (large desktops)

// Guidelines:
// - Use hidden/visible on specific breakpoints
// - Stack grids vertically on mobile, expand on desktop
// - Adjust padding/gaps responsively
// - Hide secondary actions on mobile

// ═════════════════════════════════════════════════════════════════════════
// 7. INTERACTIVE ELEMENTS
// ═════════════════════════════════════════════════════════════════════════

const INTERACTIONS = {
  // Button hover state
  BUTTON_HOVER:
    'transition-all duration-150 hover:scale-105',

  // Card hover state
  CARD_HOVER:
    'transition-all duration-200 hover:shadow-lg hover:scale-[1.02]',

  // Link hover state
  LINK_HOVER:
    'transition-colors duration-150 hover:text-[var(--battery)]',

  // Input focus state
  'INPUT_FOCUS':
    'focus:outline-none focus:ring-1 focus:ring-[var(--battery)]',
} as const;

// ═════════════════════════════════════════════════════════════════════════
// 8. COMPONENT IMPROVEMENTS BY PAGE
// ═════════════════════════════════════════════════════════════════════════

/*
COMPLETED IMPROVEMENTS:
✓ PageContainer - Consistent page-level layout and spacing
✓ SectionHeader - Improved visual hierarchy for page titles
✓ ContentGrid - Responsive grid layout for cards
✓ DashboardCard - Enhanced card styling with header/icon support
✓ FormSection - Better form field organization

CURRENT FOCUS - TO IMPROVE:
□ Dashboard Main (demo/page) - Better section organization
□ Simulation Page - Cleaner control layout
□ Configuration Page - More logical grouping
□ Financial Page - Improved form layout with sections
□ Scenarios Page - Better table styling
□ Energy Intelligence - Better KPI presentation
□ AI Assistant Page - Clearer chat interface

FUTURE ENHANCEMENTS:
□ Create consistent loading states across pages
□ Standardize error/warning displays
□ Create reusable data table component
□ Improve mobile navigation
□ Add keyboard shortcuts documentation
□ Create consistent notification system
*/

// ═════════════════════════════════════════════════════════════════════════
// 9. MOBILE OPTIMIZATION CHECKLIST
// ═════════════════════════════════════════════════════════════════════════

/*
When building page layouts, ensure:

□ Stack grid columns to single column on mobile (grid-cols-1)
□ Reduce padding on mobile (px-4 instead of px-8)
□ Hide non-essential UI elements on small screens (hidden sm:flex)
□ Ensure buttons are 44x44px minimum for touch targets
□ Use bottom sheet or modal for filters/settings on mobile
□ Keep forms to single column layouts
□ Use horizontal scrolling for data tables (wrap in overflow)
□ Test with actual mobile devices, not just browser responsive mode
*/

// ═════════════════════════════════════════════════════════════════════════
// 10. ACCESSIBILITY REQUIREMENTS
// ═════════════════════════════════════════════════════════════════════════

/*
When implementing UI improvements:

□ Add aria-labels to icon buttons
□ Use proper semantic HTML (h1, h2, etc.)
□ Ensure color contrast ratio >= 4.5:1 for text
□ Include focus indicators for keyboard navigation
□ Add role="button" to clickable divs
□ Use aria-pressed for toggle states
□ Label form inputs with <Label> component
□ Add aria-describedby for complex inputs
□ Include alt text for images
*/

// ═════════════════════════════════════════════════════════════════════════
// 11. PERFORMANCE CONSIDERATIONS
// ═════════════════════════════════════════════════════════════════════════

/*
To maintain dashboard performance:

□ Use React.memo for expensive card components
□ Implement virtualization for large lists (>100 items)
□ Lazy load charts and complex visualizations
□ Use useMemo for computed card values
□ Avoid inline function definitions in render
□ Debounce slider/input changes
□ Use CSS variables instead of inline styles where possible
*/

export {};
