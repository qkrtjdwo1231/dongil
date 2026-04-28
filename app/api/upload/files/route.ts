import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

type StorageFileRow = {
  name: string;
  path: string;
  size: number | null;
  updatedAt: string | null;
  signedUrl: string | null;
};

function createSupabaseServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createClient(url, anonKey);
}

function sanitizeFileName(fileName: string) {
  const trimmed = fileName.trim();
  const fallback = "upload-file";
  if (!trimmed) {
    return fallback;
  }

  return (
    trimmed
      .replace(/[^a-zA-Z0-9._-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || fallback
  );
}

async function listStoredFiles() {
  const supabase = createSupabaseServerClient();
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const bucket = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";
  const roots = await supabase.storage.from(bucket).list("imports", {
    limit: 200,
    sortBy: { column: "name", order: "desc" }
  });

  if (roots.error) {
    throw new Error(roots.error.message);
  }

  const folders = (roots.data ?? []).filter((entry) => !entry.id);
  const fileRows: StorageFileRow[] = [];

  for (const folder of folders) {
    const folderPath = `imports/${folder.name}`;
    const children = await supabase.storage.from(bucket).list(folderPath, {
      limit: 200,
      sortBy: { column: "name", order: "desc" }
    });

    if (children.error) {
      continue;
    }

    for (const child of children.data ?? []) {
      if (!child.id) {
        continue;
      }

      const fullPath = `${folderPath}/${child.name}`;
      const signed = await supabase.storage.from(bucket).createSignedUrl(fullPath, 60 * 60);
      fileRows.push({
        name: child.name,
        path: fullPath,
        size: child.metadata?.size ?? null,
        updatedAt: child.updated_at ?? null,
        signedUrl: signed.data?.signedUrl ?? null
      });
    }
  }

  fileRows.sort((a, b) => {
    const aTime = a.updatedAt ? Date.parse(a.updatedAt) : 0;
    const bTime = b.updatedAt ? Date.parse(b.updatedAt) : 0;
    return bTime - aTime;
  });

  return {
    bucket,
    files: fileRows.slice(0, 100)
  };
}

export async function GET() {
  try {
    const payload = await listStoredFiles();
    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to load stored files." },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client is not configured." }, { status: 503 });
    }

    const bucket = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";
    const body = (await request.json()) as { path?: string };
    const path = String(body.path ?? "").trim();
    if (!path) {
      return NextResponse.json({ error: "Missing file path." }, { status: 400 });
    }

    const response = await supabase.storage.from(bucket).remove([path]);
    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete file." },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json({ error: "Supabase client is not configured." }, { status: 503 });
    }

    const bucket = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";
    const body = (await request.json()) as { path?: string; nextName?: string };
    const path = String(body.path ?? "").trim();
    const nextName = sanitizeFileName(String(body.nextName ?? ""));

    if (!path || !nextName) {
      return NextResponse.json({ error: "Missing required values." }, { status: 400 });
    }

    const slash = path.lastIndexOf("/");
    if (slash < 0) {
      return NextResponse.json({ error: "Invalid path." }, { status: 400 });
    }

    const parent = path.slice(0, slash);
    const oldName = path.slice(slash + 1);
    const prefix = oldName.includes("-") ? `${oldName.split("-")[0]}-` : "";
    const nextPath = `${parent}/${prefix}${nextName}`;

    const response = await supabase.storage.from(bucket).move(path, nextPath);
    if (response.error) {
      return NextResponse.json({ error: response.error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, path: nextPath });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to rename file." },
      { status: 500 }
    );
  }
}
