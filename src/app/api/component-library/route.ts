import { createClient } from '@supabase/supabase-js';

import { NextResponse } from 'next/server';

import {
  SOLAR_COMPONENT_CATALOG,
  type SolarComponentCategory,
  type SolarComponentEntry,
} from '@/lib/solar-component-catalog';
import { createServerSupabaseClient } from '@/lib/supabase-server';

type UploadedAsset = {
  id: string;
  name: string;
  category: SolarComponentCategory;
  url: string;
  uploadedAt: string;
};

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

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

/** Map a DB row to SolarComponentEntry shape */
function rowToEntry(row: Record<string, unknown>): SolarComponentEntry {
  return {
    id: row.id as string,
    brand: row.brand as string,
    model: row.model as string,
    category: row.category as SolarComponentCategory,
    summary: row.summary as string,
    typicalUse: (row.typical_use as string) ?? '',
    specs: (row.specs as SolarComponentEntry['specs']) ?? [],
    datasheetUrl: (row.datasheet_url as string) ?? '',
    manualUrl: (row.manual_url as string) ?? '',
    source: (row.source as string) ?? '',
  };
}

export async function GET(request: Request) {
  const adminClient = createAdminClient();

  // Check if table has data; if not, seed from static catalog
  const { count } = await adminClient
    .from('solar_components_catalog')
    .select('id', { count: 'exact', head: true });

  if (count === 0) {
    const seedRows = SOLAR_COMPONENT_CATALOG.map((entry) => ({
      id: entry.id,
      brand: entry.brand,
      model: entry.model,
      category: entry.category,
      summary: entry.summary,
      typical_use: entry.typicalUse,
      specs: entry.specs,
      datasheet_url: entry.datasheetUrl,
      manual_url: entry.manualUrl,
      source: entry.source,
      is_builtin: true,
      user_id: null,
    }));

    // Insert in batches to avoid hitting request size limits
    const BATCH = 100;
    for (let i = 0; i < seedRows.length; i += BATCH) {
      await adminClient
        .from('solar_components_catalog')
        .upsert(seedRows.slice(i, i + BATCH), { onConflict: 'id' });
    }
  }

  // Fetch all catalog entries
  const { data: rows, error: rowsError } = await adminClient
    .from('solar_components_catalog')
    .select('*')
    .order('brand');

  if (rowsError) {
    return NextResponse.json({ error: rowsError.message }, { status: 500 });
  }

  const allEntries: SolarComponentEntry[] = (rows ?? []).map(rowToEntry);

  // Fetch uploaded assets for the authenticated user (if any)
  let uploadedAssets: UploadedAsset[] = [];
  try {
    const serverClient = await createServerSupabaseClient();
    if (!serverClient) throw new Error('Missing Supabase credentials');
    const { data: { user } } = await serverClient.auth.getUser();

    if (user) {
      const { data: assets } = await adminClient
        .from('component_assets')
        .select('*')
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false });

      uploadedAssets = (assets ?? []).map((a: Record<string, unknown>) => ({
        id: a.id as string,
        name: a.name as string,
        category: a.category as SolarComponentCategory,
        url: a.url as string,
        uploadedAt: a.uploaded_at as string,
      }));
    }
  } catch {
    // Not authenticated or cookie store unavailable — skip assets
  }

  const url = new URL(request.url);
  const format = url.searchParams.get('format');
  const categories = parseCategoryFilters(url.searchParams.get('categories'));
  const scoped = categories && categories.length > 0
    ? allEntries.filter((entry) => categories.includes(entry.category))
    : allEntries;

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
  const adminClient = createAdminClient();

  // Resolve the authenticated user (best-effort)
  let userId: string | null = null;
  try {
    const serverClient = await createServerSupabaseClient();
    if (!serverClient) throw new Error('Missing Supabase credentials');
    const { data: { user } } = await serverClient.auth.getUser();
    userId = user?.id ?? null;
  } catch {
    // Not authenticated — proceed as anonymous upload
  }

  const formData = await request.formData();
  const catalogRaw = formData.get('catalog');
  const files = formData.getAll('files').filter((item): item is File => item instanceof File && item.size > 0);

  let importedCount = 0;

  if (typeof catalogRaw === 'string' && catalogRaw.trim().length > 0) {
    const parsed = JSON.parse(catalogRaw) as SolarComponentEntry[];
    const normalized = parsed.map((entry) => ({
      id: entry.id || `${toSlug(entry.brand)}-${toSlug(entry.model)}`,
      brand: entry.brand,
      model: entry.model,
      category: entry.category,
      summary: entry.summary,
      typical_use: entry.typicalUse,
      specs: entry.specs,
      datasheet_url: entry.datasheetUrl,
      manual_url: entry.manualUrl,
      source: entry.source,
      is_builtin: false,
      user_id: userId,
    }));

    const { error: upsertError } = await adminClient
      .from('solar_components_catalog')
      .upsert(normalized, { onConflict: 'id' });

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 });
    }

    importedCount = normalized.length;
  }

  for (const file of files) {
    const categoryRaw = formData.get(`category:${file.name}`);
    const category = (typeof categoryRaw === 'string' ? categoryRaw : 'Monitoring') as SolarComponentCategory;
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const timestamp = Date.now();
    const uniqueName = `${timestamp}-${toSlug(file.name)}`;
    const storagePath = userId
      ? `${userId}/${uniqueName}`
      : `anonymous/${uniqueName}`;

    const { error: storageError } = await adminClient.storage
      .from('component-library')
      .upload(storagePath, fileBuffer, {
        contentType: file.type || 'application/octet-stream',
        upsert: false,
      });

    if (storageError) {
      console.error('Storage upload error:', storageError.message);
      continue;
    }

    const { data: publicUrlData } = adminClient.storage
      .from('component-library')
      .getPublicUrl(storagePath);

    const publicUrl = publicUrlData?.publicUrl ?? '';

    await adminClient.from('component_assets').insert({
      user_id: userId,
      component_id: null,
      name: file.name,
      category,
      storage_path: storagePath,
      url: publicUrl,
      file_size_bytes: file.size,
      mime_type: file.type || 'application/octet-stream',
    });
  }

  return NextResponse.json({
    ok: true,
    importedCount,
    uploadedFiles: files.length,
  });
}
