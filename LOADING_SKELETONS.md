# Loading Skeletons Implementation

This document describes the loading skeleton implementation for SafariCharge dashboard components.

## Overview

Loading skeletons have been added to all major dashboard components to provide a better user experience during data fetching and initialization. The skeletons match the dark energy-tech theme and provide accurate visual representations of the loading state.

## Components with Loading States

### 1. StatCards
**File:** `src/components/dashboard/StatCards.tsx`

**Props:**
- `isLoading?: boolean` - Shows skeleton state when true

**Usage:**
```tsx
<StatCards
  totalGeneration={245.6}
  currentPower={38.5}
  consumption={198.3}
  savings={2847}
  isLoading={isDataLoading}
/>
```

**Skeleton Features:**
- 4 card skeletons in grid layout
- Matches card structure with title, value, unit, and icon placeholders
- Preserves responsive grid behavior

---

### 2. PowerFlowVisualization
**File:** `src/components/dashboard/PowerFlowVisualization.tsx`

**Props:**
- `isLoading?: boolean` - Shows skeleton state when true

**Usage:**
```tsx
<PowerFlowVisualization
  solarPower={38.5}
  batteryPower={5.2}
  gridPower={-8.3}
  homePower={24.8}
  batteryLevel={85}
  flowDirection={flowDirection}
  isLoading={isDataLoading}
/>
```

**Skeleton Features:**
- Circular node placeholders matching the energy flow diagram
- Connection line placeholders
- Bottom stats summary skeletons
- Maintains component dimensions and layout

---

### 3. PanelStatusTable
**File:** `src/components/dashboard/PanelStatusTable.tsx`

**Props:**
- `isLoading?: boolean` - Shows skeleton state when true

**Usage:**
```tsx
<PanelStatusTable
  panels={panelData}
  isLoading={isDataLoading}
/>
```

**Skeleton Features:**
- 6 table row skeletons
- Column structure preserved (Panel ID, Output, Voltage, Status, Efficiency)
- Badge and progress bar placeholders
- Maintains table header

---

### 4. AlertsList
**File:** `src/components/dashboard/AlertsList.tsx`

**Props:**
- `isLoading?: boolean` - Shows skeleton state when true

**Usage:**
```tsx
<AlertsList
  alerts={systemAlerts}
  isLoading={isDataLoading}
/>
```

**Skeleton Features:**
- 3 alert item skeletons
- Icon, title, message, and badge placeholders
- Maintains card styling and spacing

---

### 5. BatteryStatusCard
**File:** `src/components/dashboard/BatteryStatusCard.tsx`

**Props:**
- `isLoading?: boolean` - Shows skeleton state when true

**Usage:**
```tsx
<BatteryStatusCard
  batteryLevel={85}
  batteryPower={5.2}
  isCharging={true}
  isLoading={isDataLoading}
/>
```

**Skeleton Features:**
- Level percentage placeholder
- Charging status badge placeholder
- Progress bar placeholder
- 3-column stats grid skeletons

---

### 6. WeatherCard
**File:** `src/components/dashboard/WeatherCard.tsx`

**Props:**
- `isLoading?: boolean` - Shows skeleton state when true

**Usage:**
```tsx
<WeatherCard
  locationName="Nairobi, Kenya"
  isLoading={isDataLoading}
/>
```

**Skeleton Features:**
- Temperature and condition placeholders
- Weather icon placeholder
- 3 metric cards (humidity, wind, irradiance)

---

## Skeleton Component

**File:** `src/components/ui/skeleton.tsx`

The base Skeleton component has been updated to use the dark theme's card muted background color (`var(--bg-card-muted)`) for better visual consistency.

**Usage:**
```tsx
import { Skeleton } from '@/components/ui/skeleton';

<Skeleton className="h-4 w-24" />
```

## Integration Example

Here's a complete example of using loading states in a dashboard:

```tsx
'use client';

import { useState, useEffect } from 'react';
import { StatCards } from '@/components/dashboard/StatCards';
import { PowerFlowVisualization } from '@/components/dashboard/PowerFlowVisualization';
import { PanelStatusTable } from '@/components/dashboard/PanelStatusTable';
import { AlertsList } from '@/components/dashboard/AlertsList';
import { BatteryStatusCard } from '@/components/dashboard/BatteryStatusCard';
import { WeatherCard } from '@/components/dashboard/WeatherCard';

export default function Dashboard() {
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState(null);

  useEffect(() => {
    // Simulate data fetch
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/dashboard-data');
        const result = await response.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <StatCards
        totalGeneration={data?.totalGeneration ?? 0}
        currentPower={data?.currentPower ?? 0}
        consumption={data?.consumption ?? 0}
        savings={data?.savings ?? 0}
        isLoading={isLoading}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PowerFlowVisualization
            solarPower={data?.solarPower ?? 0}
            batteryPower={data?.batteryPower ?? 0}
            gridPower={data?.gridPower ?? 0}
            homePower={data?.homePower ?? 0}
            batteryLevel={data?.batteryLevel ?? 0}
            flowDirection={data?.flowDirection ?? {}}
            isLoading={isLoading}
          />
        </div>
        <div className="flex flex-col gap-6">
          <WeatherCard
            locationName="Nairobi, Kenya"
            isLoading={isLoading}
          />
          <BatteryStatusCard
            batteryLevel={data?.batteryLevel ?? 0}
            batteryPower={data?.batteryPower ?? 0}
            isCharging={data?.isCharging ?? false}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <PanelStatusTable
            panels={data?.panels}
            isLoading={isLoading}
          />
        </div>
        <div>
          <AlertsList
            alerts={data?.alerts}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
```

## Design Principles

1. **Consistency**: All skeletons use the same base component and color scheme
2. **Accuracy**: Skeleton layouts match the actual component structure
3. **Smooth Transitions**: Components transition from skeleton to real content seamlessly
4. **Accessibility**: Skeletons maintain proper semantic structure
5. **Performance**: Skeletons are lightweight and don't impact performance

## Theme Integration

The skeletons integrate with the dark energy-tech theme using:
- `var(--bg-card-muted)` for skeleton backgrounds
- `animate-pulse` for loading animation
- Matching border radii and spacing
- Consistent with existing dashboard card styling

## Future Enhancements

Potential improvements for the future:
- Shimmer effect for more dynamic loading animation
- Staggered animation for multiple skeleton items
- Progressive disclosure with partial data loading
- Content hints showing data type (e.g., "Loading energy data...")
