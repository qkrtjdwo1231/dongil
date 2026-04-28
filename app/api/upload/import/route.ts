import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import {
  buildOrderInsertRows,
  buildUploadedRowInsertRows,
  extractWorkbookData,
  insertRowsInBatches
} from "@/lib/upload-processing";

export const runtime = "nodejs";

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
    `수량 ${extraction.analysis.totalQuantity.toLocaleString()}`,
    `평수 ${extraction.analysis.totalArea.toFixed(1)}`,
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

  const bucket = process.env.SUPABASE_UPLOAD_BUCKET || "uploads";
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
    path: objectPath
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
    }

    const supabase = createSupabaseServerClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Supabase 환경변수가 설정되지 않았습니다." },
        { status: 503 }
      );
    }

    const buffer = await file.arrayBuffer();
    const storedFile = await saveUploadSourceFile(supabase, file, buffer);
    const extraction = extractWorkbookData(buffer, file.name);
    const summaryText = buildSummaryText(extraction);

    const fileInsert = await supabase
      .from("uploaded_files")
      .insert({
        original_name: file.name,
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
        error: error instanceof Error ? error.message : "파일 저장 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}
