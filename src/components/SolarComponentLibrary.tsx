'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { BookOpen, Download, ExternalLink, Search, Upload } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useIsMobile } from '@/hooks/use-mobile';
import { SOLAR_COMPONENT_CATALOG, type SolarComponentCategory, type SolarComponentEntry } from '@/lib/solar-component-catalog';

type SolarComponentLibraryProps = {
  standalone?: boolean;
};

type UploadedAsset = {
  id: string;
  name: string;
  category: SolarComponentCategory;
  url: string;
  uploadedAt: string;
};

const CATEGORY_OPTIONS: Array<SolarComponentCategory | 'All'> = [
  'All',
  'Solar Module',
  'Inverter',
  'Battery Storage',
  'EV Charger',
  'Monitoring',
];

const cleanText = (text: string) => text.replace(/[–—]/g, '-');
const getHostnameLabel = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return 'manufacturer website';
  }
};

const getOriginUrl = (url: string) => {
  try {
    return new URL(url).origin;
  } catch {
    return url;
  }
};

export function SolarComponentLibrary({ standalone = false }: SolarComponentLibraryProps) {
  const isMobile = useIsMobile();
  const [catalog, setCatalog] = useState<SolarComponentEntry[]>(SOLAR_COMPONENT_CATALOG);
  const [assets, setAssets] = useState<UploadedAsset[]>([]);
  const [category, setCategory] = useState<SolarComponentCategory | 'All'>('All');
  const [brand, setBrand] = useState<string>('All');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState(SOLAR_COMPONENT_CATALOG[0]?.id ?? '');
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [importJson, setImportJson] = useState('');
  const [files, setFiles] = useState<FileList | null>(null);
  const [status, setStatus] = useState('');

  const refresh = async () => {
    const response = await fetch('/api/component-library', { cache: 'no-store' });
    if (!response.ok) return;
    const payload = await response.json();
    setCatalog(payload.entries ?? SOLAR_COMPONENT_CATALOG);
    setAssets(payload.uploadedAssets ?? []);
  };

  // Fetch on mount — wrapped in a void-returning callback to satisfy react-hooks/set-state-in-effect
  useEffect(() => {
    void refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const brands = useMemo(() => {
    const scoped = category === 'All'
