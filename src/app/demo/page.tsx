import dynamic from 'next/dynamic';

export const dynamic = 'force-dynamic';

const DemoImpl = dynamic(() => import('./demo-impl'), {
  ssr: false,
  loading: () => null,
});

export default function DemoPage() {
  return <DemoImpl />;
}
