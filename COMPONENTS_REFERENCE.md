# Dashboard UI Components - Quick Reference

## 🚀 Quick Start

### For a New Page:
```tsx
import { PageContainer, SectionHeader, ContentGrid } from '@/components/layout/PageContainer';
import { DashboardCard, DashboardGrid } from '@/components/layout/DashboardCard';

export default function MyPage() {
  return (
    <PageContainer maxWidth="lg" padding="md">
      <SectionHeader
        title="My Page"
        description="Description here"
      />
      <DashboardGrid columns={3} gap="md">
        <DashboardCard title="Card 1">Content</DashboardCard>
        <DashboardCard title="Card 2">Content</DashboardCard>
      </DashboardGrid>
    </PageContainer>
  );
}
```

### For a Form:
```tsx
import { FormSection, FormGroup, FormInput, FormRange } from '@/components/form/FormComponents';

<FormSection title="Configuration">
  <FormGroup columns={2}>
    <FormInput
      label="Field Name"
      unit="kW"
      placeholder="Enter value"
    />
    <FormRange
      label="Power Level"
      value={50}
      onChange={setValue}
      min={0}
      max={100}
      step={1}
      unit="%"
    />
  </FormGroup>
</FormSection>
```

### For Empty/Error States:
```tsx
import { EmptyState, ErrorState, LoadingState } from '@/components/layout/StateComponents';

{isLoading && <LoadingState title="Loading data..." />}
{error && <ErrorState message={error} />}
{!data && <EmptyState title="No data" description="Create something to get started" />}
```

---

## 📁 Component Locations

### Layout Components
```
src/components/layout/PageContainer.tsx
├─ PageContainer (page wrapper)
├─ SectionHeader (page title section)
├─ ContentGrid (responsive grid layout)
└─ FormSection (form field grouping)
```

### Card Components
```
src/components/layout/DashboardCard.tsx
├─ DashboardCard (individual card)
└─ DashboardGrid (card grid wrapper)
```

### State Components
```
src/components/layout/StateComponents.tsx
├─ EmptyState (no data state)
├─ ErrorState (error display)
├─ LoadingState (loading indicator)
├─ SkeletonLoader (placeholder animation)
└─ ProgressBar (progress indicator)
```

### Form Components
```
src/components/form/FormComponents.tsx
├─ FormInput (text input with label)
├─ FormRange (range slider)
├─ FormGroup (input grid wrapper)
└─ FormSection (grouped form section)
```

---

## 🎨 Component Properties Reference

### PageContainer
```tsx
interface PageContainerProps {
  children: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full'; // default: 'lg'
  padding?: 'sm' | 'md' | 'lg'; // default: 'md'
  className?: string;
}
```

### SectionHeader
```tsx
interface SectionHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
}
```

### ContentGrid
```tsx
interface ContentGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4; // default: 3
  gap?: 'sm' | 'md' | 'lg'; // default: 'md'
  className?: string;
}
```

### DashboardCard
```tsx
interface DashboardCardProps {
  children: React.ReactNode;
  title?: string;
  icon?: React.ReactNode;
  headerAction?: React.ReactNode;
  spacing?: 'sm' | 'md' | 'lg'; // default: 'md'
  variant?: 'default' | 'compact' | 'outlined'; // default: 'default'
  className?: string;
}
```

### FormInput
```tsx
interface FormInputProps extends InputHTMLAttributes {
  label?: string;
  description?: string;
  error?: string;
  unit?: string;
  showLabel?: boolean; // default: true
}
```

### FormRange
```tsx
interface FormRangeProps {
  label: string;
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
  description?: string;
}
```

### EmptyState
```tsx
interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
}
```

### ErrorState
```tsx
interface ErrorStateProps {
  title?: string; // default: 'Something went wrong'
  message: string;
  action?: React.ReactNode;
}
```

### LoadingState
```tsx
interface LoadingStateProps {
  title?: string; // default: 'Loading'
  description?: string;
}
```

---

## 🎯 Usage Examples by Page Type

### Data Dashboard Page
```tsx
<PageContainer maxWidth="xl" padding="lg">
  <SectionHeader title="Dashboard" />
  
  <div className="space-y-8">
    {/* KPI Cards */}
    <DashboardGrid columns={4} gap="md">
      <DashboardCard>KPI 1</DashboardCard>
      <DashboardCard>KPI 2</DashboardCard>
      <DashboardCard>KPI 3</DashboardCard>
      <DashboardCard>KPI 4</DashboardCard>
    </DashboardGrid>
    
    {/* Charts */}
    <DashboardGrid columns={2} gap="md">
      <DashboardCard title="Chart 1">Chart</DashboardCard>
      <DashboardCard title="Chart 2">Chart</DashboardCard>
    </DashboardGrid>
  </div>
</PageContainer>
```

### Configuration/Settings Page
```tsx
<PageContainer maxWidth="lg" padding="md">
  <SectionHeader title="Settings" />
  
  <div className="space-y-6">
    <FormSection title="System Configuration">
      <FormGroup columns={2}>
        <FormInput label="System Name" />
        <FormInput label="Location" />
        <FormRange label="Power Rating" value={50} onChange={setVal} min={0} max={100} step={1} />
      </FormGroup>
    </FormSection>
    
    <FormSection title="Advanced Options">
      <FormInput label="API Key" type="password" />
    </FormSection>
  </div>
</PageContainer>
```

### Analysis/Comparison Page
```tsx
<PageContainer maxWidth="xl" padding="lg">
  <SectionHeader 
    title="Analysis Results"
    description="Compare different scenarios"
  />
  
  {isLoading && <LoadingState title="Analyzing..." />}
  {error && <ErrorState message={error} />}
  {data?.length === 0 && <EmptyState title="No results" />}
  
  {data && (
    <DashboardGrid columns={3} gap="md">
      {data.map(item => (
        <DashboardCard key={item.id} title={item.name}>
          {/* Item content */}
        </DashboardCard>
      ))}
    </DashboardGrid>
  )}
</PageContainer>
```

---

## 🔧 Common Customizations

### Custom Card Styling
```tsx
<DashboardCard
  variant="outlined" // bordered without background fill
  title="Custom Card"
  spacing="sm" // tighter padding
  className="border-blue-500" // add custom border color
>
  Content
</DashboardCard>
```

### Responsive Layout
```tsx
<ContentGrid
  columns={3}     // 3 columns on desktop
  gap="lg"        // generous spacing
  className="md:grid-cols-1 lg:grid-cols-2" // override breakpoints
>
  {/* Items */}
</ContentGrid>
```

### Form Validation Display
```tsx
<FormInput
  label="Email"
  error={errors.email ? "Invalid email" : undefined}
  value={email}
  onChange={(e) => setEmail(e.target.value)}
/>
```

---

## 📚 Documentation Files

- **DESIGN_SYSTEM.ts** - Complete design tokens and guidelines
- **UI_IMPROVEMENTS.md** - Detailed improvement guide and roadmap
- **SESSION_SUMMARY.md** - Overview of all changes in this session

---

## ✅ Checklist: Using Components in New Pages

- [ ] Import PageContainer and wrap page content
- [ ] Add SectionHeader at top of page
- [ ] Use ContentGrid or DashboardGrid for card layouts
- [ ] Replace custom Card wrappers with DashboardCard
- [ ] Use FormSection for form organization
- [ ] Add EmptyState/ErrorState/LoadingState for data states
- [ ] Test on mobile (375px), tablet (768px), desktop (1920px)
- [ ] Verify TypeScript compilation: `npm run typecheck`
- [ ] Check ESLint: `npm run lint`

---

## 🆘 Troubleshooting

### Components not showing?
- Make sure imports are correct
- Check that maxWidth and padding props are valid options
- Verify components are exported from their files

### Styling looks wrong?
- Check CSS variable names (use `var(--battery)` not `var(--primary)`)
- Ensure className props are passed correctly
- Verify Tailwind classes are spelled correctly

### Mobile layout broken?
- Verify responsive class names (md:, lg:)
- Check that columns={2} or higher (not 1) on mobile
- Test with actual device, not just browser emulation

---

## 🎓 Best Practices

1. **Always use PageContainer** - Ensures consistent page margins and spacing
2. **Use SectionHeader** - Creates visual hierarchy for page sections
3. **Prefer ContentGrid** - Handles responsive layouts automatically
4. **Group related forms** - Use FormSection for clear organization
5. **Show loading states** - Use LoadingState component for async operations
6. **Handle empty data** - Use EmptyState when no data is available
7. **Display errors clearly** - Use ErrorState for failures

---

## 📦 Import Template

```tsx
'use client';

// Layout
import { PageContainer, SectionHeader, ContentGrid, FormSection } from '@/components/layout/PageContainer';
import { DashboardCard, DashboardGrid } from '@/components/layout/DashboardCard';

// Forms
import { FormInput, FormRange, FormGroup } from '@/components/form/FormComponents';

// States
import { EmptyState, ErrorState, LoadingState, SkeletonLoader, ProgressBar } from '@/components/layout/StateComponents';

// Other
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
```

---

**Last Updated:** Current Session  
**Status:** Ready for use ✅
