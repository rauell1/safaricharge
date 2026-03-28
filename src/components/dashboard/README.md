# SafariCharge Dashboard Components

This directory contains the modular dashboard components implementing the dark energy-tech theme for SafariCharge.

## Components Overview

### Layout Components

#### `DashboardLayout`
Wrapper component that provides the fixed sidebar and scrollable main content area.

```tsx
<DashboardLayout>
  {/* Your dashboard content */}
</DashboardLayout>
```

#### `DashboardSidebar`
Fixed vertical sidebar (~260px width) with navigation sections.

**Features:**
- Main navigation: Dashboard, Generation, Consumption, Panels, Battery, Savings
- System section: Alerts (with badge count), Settings
- Active page highlighting
- Mobile-responsive with overlay
- Status indicator

**Props:**
```tsx
interface DashboardSidebarProps {
  activeSection?: string;
  onSectionChange?: (section: string) => void;
  alertCount?: number;
}
```

#### `DashboardHeader`
Sticky header with date display, location, filters, notifications, and actions.

**Props:**
```tsx
interface DashboardHeaderProps {
  currentDate: Date;
  onReset?: () => void;
  onLocationClick?: () => void;
  onDownload?: () => void;
  locationName?: string;
  notificationCount?: number;
}
```

### Data Visualization Components

#### `StatCards`
Four key metric cards displaying Generation, Current Power, Consumption, and Savings.

**Features:**
- Animated counters
- Hover effects with subtle lift
- Color-coded glows
- Trend indicators

**Props:**
```tsx
interface StatCardsProps {
  totalGeneration: number;
  currentPower: number;
  consumption: number;
  savings: number;
}
```

#### `PowerFlowVisualization`
Visual representation of energy flow between Solar, Battery, Home, and Grid.

**Features:**
- Animated flow lines
- Real-time power values
- Color-coded energy types
- Interactive hover states

**Props:**
```tsx
interface PowerFlowVisualizationProps {
  solarPower: number;
  batteryPower: number;
  gridPower: number;
  homePower: number;
  batteryLevel: number;
  flowDirection: {
    solarToHome: boolean;
    solarToBattery: boolean;
    solarToGrid: boolean;
    batteryToHome: boolean;
    gridToHome: boolean;
  };
}
```

### Monitoring Components

#### `PanelStatusTable`
System diagnostics table showing panel performance.

**Features:**
- Color-coded status badges (online/warning/offline)
- Efficiency progress bars
- Sortable columns
- Hover effects

**Props:**
```tsx
interface PanelData {
  id: string;
  output: number;
  voltage: number;
  status: 'online' | 'warning' | 'offline';
  efficiency: number;
}

interface PanelStatusTableProps {
  panels?: PanelData[];
}
```

#### `AlertsList`
System alerts and notifications display.

**Features:**
- Type-based icons and badges (error, warning, info, success)
- Relative timestamps
- Filter by type
- Empty state

**Props:**
```tsx
interface Alert {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  timestamp: Date;
}

interface AlertsListProps {
  alerts?: Alert[];
}
```

### Utility Components

#### `TimeRangeSwitcher`
Time range selector for filtering dashboard data.

**Props:**
```tsx
interface TimeRangeSwitcherProps {
  selectedRange: 'today' | 'week' | 'month' | 'year';
  onRangeChange: (range: 'today' | 'week' | 'month' | 'year') => void;
}
```

## Design System

### Color Palette

**Primary Colors:**
- Primary Dark: `#0a0e1a` (Very dark navy/black)
- Secondary Dark: `#1a1f35` (Slightly lighter panels)
- Surface Dark: `#1a1f35` (Elevated dark surfaces)

**Accent Colors:**
- Solar: `#fbbf24` (Amber/Yellow) - Solar energy
- Energy: `#10b981` (Green) - Positive energy/savings
- Alert: `#ef4444` (Red) - Errors/warnings
- Grid: `#8b5cf6` (Purple) - Grid/export
- Info: `#3b82f6` (Blue) - Information/consumption

**Text Colors:**
- Primary: `#f8fafc` (Light text)
- Secondary: `#94a3b8` (Muted text)
- Tertiary: `#64748b` (Very muted text)

### Shadows and Glows

Custom shadow utilities for accent colors:
- `shadow-glow-sm`, `shadow-glow-md`, `shadow-glow-lg` (Blue glow)
- `shadow-glow-solar` (Amber glow)
- `shadow-glow-energy` (Green glow)
- `shadow-glow-alert` (Red glow)

### Animations

**Available Animations:**
- `animate-pulse-slow` - Slow pulse effect (3s)
- `animate-slide-in` - Slide in from top (0.2s)
- `animate-fade-in` - Fade in (0.3s)
- `animate-counter` - Counter scale animation (0.5s)
- `animate-flow-horizontal` - Horizontal flow for power lines (2s)

**Custom CSS Classes:**
- `.card-hover` - Card hover effect with lift and glow
- `.stat-card-solar` - Solar-themed glow on hover
- `.stat-card-energy` - Energy-themed glow on hover
- `.stat-card-alert` - Alert-themed glow on hover
- `.gradient-text-solar` - Solar gradient text
- `.gradient-text-energy` - Energy gradient text
- `.status-online` - Pulsing status indicator

### Transparent Accent Backgrounds

Use these for subtle highlights:
- `.bg-accent-solar-transparent` - rgba(251, 191, 36, 0.1)
- `.bg-accent-energy-transparent` - rgba(16, 185, 129, 0.1)
- `.bg-accent-alert-transparent` - rgba(239, 68, 68, 0.1)
- `.bg-accent-grid-transparent` - rgba(139, 92, 246, 0.1)
- `.bg-accent-info-transparent` - rgba(59, 130, 246, 0.1)

## Usage Example

```tsx
import {
  DashboardLayout,
  DashboardHeader,
  StatCards,
  PowerFlowVisualization,
  PanelStatusTable,
  AlertsList,
  TimeRangeSwitcher,
} from '@/components/dashboard';

export default function MyDashboard() {
  const [timeRange, setTimeRange] = useState('today');

  return (
    <DashboardLayout>
      <DashboardHeader
        currentDate={new Date()}
        locationName="Nairobi, Kenya"
      />

      <main className="flex-1 overflow-y-auto p-6 space-y-6">
        <TimeRangeSwitcher
          selectedRange={timeRange}
          onRangeChange={setTimeRange}
        />

        <StatCards
          totalGeneration={245.6}
          currentPower={38.5}
          consumption={198.3}
          savings={2847}
        />

        <PowerFlowVisualization
          solarPower={38.5}
          batteryPower={5.2}
          gridPower={-8.3}
          homePower={24.8}
          batteryLevel={85}
          flowDirection={{
            solarToHome: true,
            solarToBattery: true,
            solarToGrid: true,
            batteryToHome: false,
            gridToHome: false,
          }}
        />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PanelStatusTable />
          <AlertsList />
        </div>
      </main>
    </DashboardLayout>
  );
}
```

## Demo

Visit `/demo` to see all components in action with mock data.

## Responsive Behavior

All components are fully responsive:
- **Mobile (<768px)**: Sidebar becomes an overlay, cards stack vertically
- **Tablet (768px-1024px)**: 2-column grid layouts
- **Desktop (>1024px)**: Full multi-column layouts, fixed sidebar

## Accessibility

- Semantic HTML elements
- ARIA labels and roles
- Keyboard navigation support
- Color contrast ratios meet WCAG AA standards
- Status indicators with text alternatives

## Performance

- Components use React.memo for expensive renders
- Lazy loading for heavy charts
- Optimized animations with CSS transforms
- Debounced interactions

## Browser Support

- Chrome/Edge: Latest 2 versions
- Firefox: Latest 2 versions
- Safari: Latest 2 versions
- Mobile browsers: iOS Safari 14+, Chrome Android 90+
