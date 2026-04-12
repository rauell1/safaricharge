// ⚠️  COMPATIBILITY SHIM
// demo/page.tsx imports from '@/components/energy/RecommendationComponents'
// but the canonical file lives in src/components/recommendation/.
export { RecommendationComponents } from '@/components/recommendation/RecommendationComponents';
export type * from '@/components/recommendation/RecommendationComponents';
