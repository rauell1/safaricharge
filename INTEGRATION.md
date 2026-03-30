# Energy System Integration Architecture

**Last Updated:** March 29, 2026
**Status:** ✅ Phase 1 Complete - State Synchronization Layer Implemented

## 📋 Overview

This document describes the unified state synchronization architecture that connects all energy system components (Energy Flow Diagram, System Visualization, Sidebar Navigation, and Reports) through a single source of truth.

---

## 🎯 The Problem We Solved

Previously, the dashboard had multiple disconnected pieces:
- ❌ Energy Flow Diagram (real-time) - isolated state
- ❌ Dashboard components - using mock data
- ❌ Main simulation - separate state management
- ❌ Reports - broken due to state structure changes
- ❌ Sidebar navigation - cosmetic only, not functional

**Result:** Features felt like separate tools, not one integrated system.

---

## ✅ The Solution: State Synchronization Layer

We implemented a **Zustand-based central state store** that all components read from and update. This creates a binding layer that synchronizes everything.

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│         Energy System Store (Single Source of Truth)    │
│  ┌─────────────────────────────────────────────────┐   │
│  │  • nodes: {solar, battery, grid, home, ev1, ev2}│   │
│  │  • flows: [active energy flows between nodes]   │   │
│  │  • selectedNode: currently selected node         │   │
│  │  • timeRange: data filter                       │   │
│  │  • accumulators: running totals                 │   │
│  │  • minuteData: complete history for reports     │   │
│  └─────────────────────────────────────────────────┘   │
└────────────┬──────────────┬──────────────┬─────────────┘
             │              │              │
    ┌────────┴────┐  ┌─────┴──────┐  ┌────┴─────┐
    │ Energy Flow │  │   Sidebar  │  │ Reports  │
    │  Diagram    │  │ Navigation │  │ Service  │
    └─────────────┘  └────────────┘  └──────────┘
```

---

## 🗂️ File Structure

### New Files Created

```
src/
├── stores/
│   └── energySystemStore.ts          # Zustand store - SINGLE SOURCE OF TRUTH
│
├── hooks/
│   └── useEnergySystem.ts            # Custom hooks for accessing store
│
├── lib/
│   └── services/
│       └── reportService.ts          # Centralized report data access
│
└── components/
    └── dashboard/
        └── PowerFlowVisualization.tsx  # ✅ Updated with clickable nodes
```

---

## 🔧 Implementation Details

### 1. Energy System Store (`src/stores/energySystemStore.ts`)

**Purpose:** Central state management using Zustand

**Key Features:**
- **Nodes:** Real-time state of each energy component
- **Flows:** Active energy flows between nodes
- **Selection:** Tracks which node is selected for detail views
- **History:** Minute-by-minute simulation data for reports
- **Actions:** Update methods that all components use

**Example Usage:**
```typescript
import { useEnergySystemStore } from '@/stores/energySystemStore';

// In a component
const { nodes, flows, selectNode, updateNode } = useEnergySystemStore();

// Update a node
updateNode('battery', {
  powerKW: 5.2,
  soc: 85,
  status: 'charging'
});

// Select a node (triggers UI updates everywhere)
selectNode('battery');
```

---

### 2. Custom Hooks (`src/hooks/useEnergySystem.ts`)

**Purpose:** Convenient access patterns for the store

**Available Hooks:**

| Hook | Purpose | Example |
|------|---------|---------|
| `useEnergyData()` | Get all energy system data | `const { nodes, flows } = useEnergyData()` |
| `useEnergyNode(type)` | Get specific node | `const solar = useEnergyNode('solar')` |
| `useNodeSelection()` | Selection state + actions | `const { selectNode, isSelected } = useNodeSelection()` |
| `useEnergyFlows()` | Get all flows | `const flows = useEnergyFlows()` |
| `useAccumulators()` | Get running totals | `const { solar, savings } = useAccumulators()` |
| `useMinuteData()` | Get historical data | `const data = useMinuteData('today')` |
| `useEnergyStats()` | Get aggregated stats | `const { totalSolarKWh } = useEnergyStats('week')` |

---

### 3. Report Service (`src/lib/services/reportService.ts`)

**Purpose:** Fixes broken reports by centralizing data access

**Problem Solved:**
Reports broke because they were reading from old component state. Now they read from the central store.

**Functions:**

```typescript
import { getReportData, generatePDFReport, generateExcelReport } from '@/lib/services/reportService';

// Get data for custom report
const data = getReportData();
console.log(data.statistics.totalSolarKWh);

// Generate PDF (opens in new tab)
await generatePDFReport();

// Generate Excel (downloads file)
await generateExcelReport();

// Generate CSV
generateCSVExport();
```

---

### 4. Interactive Energy Flow (`PowerFlowVisualization`)

**Changes Made:**
- ✅ Nodes are now **clickable**
- ✅ Clicking a node **updates global state** (`selectNode()`)
- ✅ Selected node **highlights** across all components
- ✅ Hover effects and visual feedback
- ✅ Keyboard accessible (Enter/Space)

**How It Works:**

```typescript
export function PowerFlowVisualization({ solarPower, batteryPower, ... }) {
  const { selectNode, isSelected } = useNodeSelection();

  const handleNodeClick = (nodeType: NodeType) => {
    selectNode(nodeType);  // ← Updates global state
    // Future: router.push(`/${nodeType}`);
  };

  return (
    <EnergyNode
      nodeType="battery"
      onClick={handleNodeClick}
      isSelected={isSelected('battery')}  // ← Reacts to global state
      {...otherProps}
    />
  );
}
```

**Result:**
- Click Battery → `selectedNode = 'battery'` in store
- All components reading from store react automatically
- Future: Can navigate to `/battery` detail page

---

## 🔗 Integration Rules

### Rule #1: Every Component Must Read From Store

❌ **Bad** (isolated state):
```typescript
const [batteryPower, setBatteryPower] = useState(0);
```

✅ **Good** (shared state):
```typescript
const battery = useEnergyNode('battery');
const power = battery.powerKW;
```

---

### Rule #2: Every Component Must Update Store

❌ **Bad** (local mutation):
```typescript
setPower(newValue);  // Only this component knows
```

✅ **Good** (global update):
```typescript
updateNode('battery', { powerKW: newValue });  // Everyone knows
```

---

### Rule #3: UI Actions Must Update Selection State

**Example:** Sidebar button click

```typescript
const handleBatteryClick = () => {
  // DO BOTH:
  router.push('/battery');      // 1. Navigate
  selectNode('battery');         // 2. Update selection state
};
```

**Why?** This ensures:
- Energy Flow highlights the battery
- System Visualization zooms to battery
- Detail panel shows battery info
- Everything stays synchronized

---

## 🚀 Next Steps (Implementation Roadmap)

### ✅ Phase 1: Foundation (COMPLETE)
- [x] Create Zustand energy system store
- [x] Create custom hooks
- [x] Create report service
- [x] Make PowerFlowVisualization interactive

### 🔄 Phase 2: Navigation (IN PROGRESS)
- [ ] Update DashboardSidebar with state sync
- [ ] Create route structure for sections
- [ ] Implement navigation handlers
- [ ] Test selection → navigation flow

### 📋 Phase 3: Visualization
- [ ] Create SystemArchitectureVisualization component
- [ ] Link both visualizations to same state
- [ ] Add detail panels for each node type

### 🔌 Phase 4: Main App Integration
- [ ] Connect main page simulation to store
- [ ] Replace local state with store updates
- [ ] Migrate existing data flow

### 🧪 Phase 5: Testing
- [ ] Test state synchronization
- [ ] Test report generation
- [ ] Test navigation flows
- [ ] Performance optimization

---

## 📊 Current State Summary

### What Works Now:
✅ Central state store exists
✅ Custom hooks available for all components
✅ Report service can access data
✅ PowerFlowVisualization nodes are clickable
✅ Node selection updates global state
✅ Visual feedback for selected nodes

### What's Next:
🔄 Sidebar navigation needs state sync
🔄 Routes need to be created
🔄 Main simulation needs integration
🔄 System visualization needs creation

---

## 💡 Usage Examples

### Example 1: Reading Node State

```typescript
import { useEnergyNode } from '@/hooks/useEnergySystem';

function BatteryCard() {
  const battery = useEnergyNode('battery');

  return (
    <div>
      <p>Power: {battery.powerKW} kW</p>
      <p>SOC: {battery.soc}%</p>
      <p>Status: {battery.status}</p>
    </div>
  );
}
```

### Example 2: Updating Node State

```typescript
import { useEnergySystemStore } from '@/stores/energySystemStore';

function SimulationEngine() {
  const updateNode = useEnergySystemStore(state => state.updateNode);

  // In simulation loop
  useEffect(() => {
    const interval = setInterval(() => {
      updateNode('solar', {
        powerKW: calculateSolarPower(),
        efficiency: calculateEfficiency()
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);
}
```

### Example 3: Node Selection + Navigation

```typescript
import { useNodeSelection } from '@/hooks/useEnergySystem';
import { useRouter } from 'next/navigation';

function Sidebar() {
  const { selectNode } = useNodeSelection();
  const router = useRouter();

  const handleBatteryClick = () => {
    selectNode('battery');        // Update state
    router.push('/battery');       // Navigate
  };

  return <button onClick={handleBatteryClick}>Battery</button>;
}
```

### Example 4: Generating Reports

```typescript
import { generatePDFReport, getReportSummary } from '@/lib/services/reportService';

function ReportButton() {
  const [loading, setLoading] = useState(false);
  const summary = getReportSummary();

  const handleGenerate = async () => {
    setLoading(true);
    try {
      await generatePDFReport();  // Opens in new tab
    } catch (error) {
      console.error('Report failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button onClick={handleGenerate} disabled={loading}>
      {loading ? 'Generating...' : `Generate Report (${summary.dataPoints} points)`}
    </button>
  );
}
```

---

## 🎨 Visual Feedback

### Node Selection States

| State | Visual Feedback |
|-------|----------------|
| **Normal** | Standard styling with subtle glow |
| **Hover** | Scale 110%, increased glow opacity |
| **Selected** | Scale 105%, solid border, ring effect, "Selected" badge |
| **Clickable** | Cursor pointer, underline on label hover |

### Interactive Elements

- **Nodes:** Click to select, keyboard accessible
- **Flows:** Animated particles show direction
- **Stats:** Real-time updates from store

---

## 🔍 Debugging

### Check Store State

```typescript
// In browser console or component
import { useEnergySystemStore } from '@/stores/energySystemStore';

const state = useEnergySystemStore.getState();
console.log('Current nodes:', state.nodes);
console.log('Selected:', state.selectedNode);
console.log('Flows:', state.flows);
```

### Common Issues

| Issue | Cause | Solution |
|-------|-------|----------|
| Node not highlighting | Not using `isSelected` prop | Use `useNodeSelection()` hook |
| Data not updating | Not calling `updateNode()` | Call store update function |
| Reports empty | No data in `minuteData` | Ensure simulation adds data with `addMinuteData()` |
| Selection not persisting | Component recreating state | Use store, not local `useState` |

---

## 📚 API Reference

### Store Actions

```typescript
// Node updates
updateNode(nodeType: NodeType, updates: Partial<EnergyNode>): void

// Flow updates
updateFlows(flows: EnergyFlow[]): void

// Selection
selectNode(nodeType: NodeType | null): void

// Time range
setTimeRange(range: TimeRange): void

// Accumulators
updateAccumulators(updates: Partial<Accumulators>): void

// History
addMinuteData(data: MinuteDataPoint): void

// Simulation
setSimulationState(updates: { currentDate?, timeOfDay?, isAutoMode?, simSpeed? }): void

// Configuration
updateSystemConfig(config: Partial<SystemConfig>): void

// Reset
resetSystem(): void
```

---

## 🎯 Success Metrics

We'll know this is working when:
- ✅ Every sidebar button navigates AND updates selection
- ✅ Clicking energy nodes shows relevant details
- ✅ Reports generate successfully from store
- ✅ All data comes from single simulation engine
- ✅ UI feels responsive and intelligent
- ✅ System works on mobile devices
- ✅ Users can find any metric within 2 clicks

---

## 📝 Notes

- **Performance:** Zustand is optimized for React. Components only re-render when their specific slice of state changes.
- **TypeScript:** Full type safety across all store interactions.
- **Testing:** Store can be tested independently of components.
- **Scalability:** Easy to add new nodes (e.g., ev1, ev2) or new data fields.
- **Migration:** Old components can gradually adopt the store without breaking.

---

## 🤝 Contributing

When adding new features:

1. **Read from store** - Use appropriate hook from `useEnergySystem.ts`
2. **Update store** - Call store actions, don't use local state
3. **Sync selection** - Update `selectedNode` when user interacts
4. **Test integration** - Ensure other components react to your changes

---

**Questions?** Check the code examples above or review the store/hook implementations.
