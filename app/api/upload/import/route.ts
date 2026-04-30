import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildOrderInsertRows,
  buildUploadedRowInsertRows,
  extractWorkbookData,
  insertRowsInBatches
} from "@/lib/upload-processing";

export const runtime = "nodejs";

type ImportFromStorageBody = {
  storedPath?: string;
  storedBucket?: string;
  originalName?: string;
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

function buildSummaryText(extraction: ReturnType<typeof extractWorkbookData>) {
  const parts = [
    `총 ${extraction.totalRows.toLocaleString()}행`,
    extraction.analysis.periodStart && extraction.analysis.periodEnd
      ? `${extraction.analysis.periodStart} ~ ${extraction.analysis.periodEnd}`
      : null,
    `총 수량 ${extraction.analysis.totalQuantity.toLocaleString()}`,
    `총 평수 ${extraction.analysis.totalArea.toFixed(1)}`,
    extraction.analysis.highlights[0] ?? null
  ];

  return parts.filter(Boolean).join(" · ");
}

async function saveUploadSourceFile(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  file: File,
  buffer: ArrayBuffer
) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const bucket = process.env.SUPABASE_UPLOAD_BUCKET || process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET || "uploads";
  const today = new Date().toISOString().slice(0, 10);
  const safeFileName = sanitizeFileName(file.name);
  const objectPath = `imports/${today}/${crypto.randomUUID()}-${safeFileName}`;
  const uploadResponse = await supabase.storage.from(bucket).upload(objectPath, buffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false
  });

  if (uploadResponse.error) {
    throw new Error(`Failed to store uploaded file: ${uploadResponse.error.message}`);
  }

  return {
    bucket,
    path: objectPath,
    fileName: file.name
  };
}

async function loadStoredSourceFile(
  supabase: ReturnType<typeof createSupabaseServerClient>,
  bucket: string,
  path: string
) {
  if (!supabase) {
    throw new Error("Supabase client is not configured.");
  }

  const response = await supabase.storage.from(bucket).download(path);
  if (response.error || !response.data) {
    throw new Error(response.error?.message ?? "저장된 원본 파일을 읽지 못했습니다.");
  }

  return response.data.arrayBuffer();
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const contentType = request.headers.get("content-type") ?? "";
    let buffer: ArrayBuffer;
    let fileName: string;
    let storedFile: { bucket: string; path: string };

    if (contentType.includes("application/json")) {
      const body = (await request.json()) as ImportFromStorageBody;
      const storedPath = String(body.storedPath ?? "").trim();
      const storedBucket = String(
        body.storedBucket ?? process.env.SUPABASE_UPLOAD_BUCKET ?? process.env.NEXT_PUBLIC_SUPABASE_UPLOAD_BUCKET ?? "uploads"
      ).trim();
      const originalName = String(body.originalName ?? "").trim();

      if (!storedPath) {
        return NextResponse.json({ error: "저장된 파일 경로가 없습니다." }, { status: 400 });
      }

      buffer = await loadStoredSourceFile(supabase, storedBucket, storedPath);
      fileName = originalName || storedPath.split("/").pop() || "upload-file.xlsx";
      storedFile = {
        bucket: storedBucket,
        path: storedPath
      };
    } else {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!(file instanceof File)) {
        return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
      }

      buffer = await file.arrayBuffer();
      const uploadSource = await saveUploadSourceFile(supabase, file, buffer);
      storedFile = {
        bucket: uploadSource.bucket,
        path: uploadSource.path
      };
      fileName = uploadSource.fileName;
    }

    const extraction = extractWorkbookData(buffer, fileName);
    const summaryText = buildSummaryText(extraction);

    const fileInsert = await supabase
      .from("uploaded_files")
      .insert({
        original_name: fileName,
        stored_bucket: storedFile.bucket,
        stored_path: storedFile.path,
        sheet_name: extraction.sheetName,
        total_rows: extraction.totalRows,
        parsed_rows: extraction.parsedRows.length,
        status: "processing",
        header_snapshot: extraction.headers,
        summary_text: summaryText,
        analysis_snapshot: extraction.analysis
      })
      .select("id")
      .single();

    if (fileInsert.error || !fileInsert.data) {
      throw new Error(fileInsert.error?.message ?? "uploaded_files 저장에 실패했습니다.");
    }

    const uploadedFileId = fileInsert.data.id as string;
    const uploadedRows = buildUploadedRowInsertRows(uploadedFileId, extraction.parsedRows);
    const orderRows = buildOrderInsertRows(extraction.parsedRows);

    await insertRowsInBatches(uploadedRows, async (rows) => {
      const response = await supabase.from("uploaded_rows").insert(rows);
      if (response.error) {
        throw new Error(response.error.message);
      }
    });

    if (orderRows.length) {
      await insertRowsInBatches(orderRows, async (rows) => {
        const response = await supabase.from("orders").insert(rows);
        if (response.error) {
          throw new Error(response.error.message);
        }
      });
    }

    const statusUpdate = await supabase
      .from("uploaded_files")
      .update({
        status: "completed",
        parsed_rows: extraction.parsedRows.length,
        summary_text: summaryText,
        analysis_snapshot: extraction.analysis
      })
      .eq("id", uploadedFileId);

    if (statusUpdate.error) {
      throw new Error(statusUpdate.error.message);
    }

    return NextResponse.json({
      fileName: extraction.fileName,
      sheetName: extraction.sheetName,
      totalRows: extraction.totalRows,
      validRows: extraction.validRows,
      invalidRows: extraction.invalidRows,
      insertedRows: orderRows.length,
      insertedUploadRows: uploadedRows.length,
      uploadedFileId,
      storedFileBucket: storedFile.bucket,
      storedFilePath: storedFile.path,
      analysis: extraction.analysis
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "파일 처리 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
