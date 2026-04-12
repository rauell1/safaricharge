// ⚠️  COMPATIBILITY SHIM
// component-knowledge-base/page.tsx imports from '@/components/SolarComponentLibrary'.
// The canonical file lives at src/components/energy/SolarComponentLibrary.
// Source uses named export only (no default export)
export { SolarComponentLibrary } from '@/components/energy/SolarComponentLibrary';
export { SolarComponentLibrary as default } from '@/components/energy/SolarComponentLibrary';
export * from '@/components/energy/SolarComponentLibrary';
