import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { NextResponse } from 'next/server';

import {
  SOLAR_COMPONENT_CATALOG,
  type SolarComponentCategory,
  type SolarComponentEntry,
} from '@/lib/solar-component-catalog';

type UploadedAsset = {
  id: string;
  name: string;
  category: SolarComponentCategory;
  url: string;
  uploadedAt: string;
};

const DATA_DIR = path.join(process.cwd(), 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'component-catalog.json');
const ASSET_FILE = path.join(DATA_DIR, 'component-assets.json');
const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads', 'component-library');

async function ensureDataFiles() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(UPLOAD_DIR, { recursive: true });
}

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function toSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function toCsv(entries: SolarComponentEntry[]) {
  const header = [
    'id',
    'brand',
    'model',
    'category',
    'summary',
    'typicalUse',
    'datasheetUrl',
    'manualUrl',
    'source',
    'specs',
  ];

  const csvValue = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = entries.map((entry) => {
    const specs = entry.specs.map((spec) => `${spec.label}: ${spec.value}`).join(' | ');
    return [
      entry.id,
      entry.brand,
      entry.model,
      entry.category,
      entry.summary,
      entry.typicalUse,
      entry.datasheetUrl,
      entry.manualUrl,
      entry.source,
      specs,
    ].map(csvValue).join(',');
  });

  return [header.join(','), ...rows].join('\n');
}

function parseCategoryFilters(raw: string | null) {
  if (!raw) return null;
  return raw
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean) as SolarComponentCategory[];
}

export async function GET(request: Request) {
  await ensureDataFiles();

  const localEntries = await readJsonFile<SolarComponentEntry[]>(CATALOG_FILE, []);
  const uploadedAssets = await readJsonFile<UploadedAsset[]>(ASSET_FILE, []);
  const merged = [...localEntries, ...SOLAR_COMPONENT_CATALOG];
  const deduped = Array.from(new Map(merged.map((entry) => [entry.id, entry])).values());

  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const categories = parseCategoryFilters(url.searchParams.get('categories'));
  const scoped = categories && categories.length > 0
    ? deduped.filter((entry) => categories.includes(entry.category))
    : deduped;

  if (format === 'csv') {
    return new NextResponse(toCsv(scoped), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="component-catalog.csv"',
      },
    });
  }

  return NextResponse.json({
    entries: scoped,
    uploadedAssets,
    total: scoped.length,
  });
}

export async function POST(request: Request) {
  await ensureDataFiles();

  const formData = await request.formData();
  const catalogRaw = formData.get('catalog');
  const files = formData.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);

  let importedCount = 0;

  if (typeof catalogRaw === 'string' && catalogRaw.trim().length > 0) {
    const parsed = JSON.parse(catalogRaw) as SolarComponentEntry[];
    const normalized = parsed.map((entry) => ({ ...entry, id: entry.id || `${toSlug(entry.brand)}-${toSlug(entry.model)}` }));
    await writeFile(CATALOG_FILE, JSON.stringify(normalized, null, 2), 'utf-8');
    importedCount = normalized.length;
  }

  const uploadedAssets = await readJsonFile<UploadedAsset[]>(ASSET_FILE, []);

  for (const file of files) {
    const categoryRaw = formData.get(`category:${file.name}`);
    const category = (typeof categoryRaw === 'string' ? categoryRaw : 'Monitoring') as SolarComponentCategory;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const uniqueName = `${Date.now()}-${toSlug(file.name)}`;
    const filePath = path.join(UPLOAD_DIR, uniqueName);

    await writeFile(filePath, fileBuffer);

    uploadedAssets.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: file.name,
      category,
      url: `/uploads/component-library/${uniqueName}`,
      uploadedAt: new Date().toISOString(),
    });
  }

  await writeFile(ASSET_FILE, JSON.stringify(uploadedAssets.slice(0, 200), null, 2), 'utf-8');

  return NextResponse.json({
    ok: true,
    importedCount,
    uploadedFiles: files.length,
  });
}
