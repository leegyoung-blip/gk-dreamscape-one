import { NextResponse } from "next/server";
import { checkCurriculumDeveloperFromRequest } from "@/lib/checkAdmin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const STORAGE_BUCKETS = {
  math: "core-question-assets",
  science: "quiz-assets",
} as const;

type DeploymentSubject = keyof typeof STORAGE_BUCKETS;

const MAX_FILE_BYTES = 8 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

function json(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

function isDeploymentSubject(value: string): value is DeploymentSubject {
  return value === "math" || value === "science";
}

function validPath(
  path: string,
  subject: DeploymentSubject,
  level: number,
) {
  const expectedPrefix = `${subject}/p${level}/`;

  return (
    path.startsWith(expectedPrefix) &&
    !path.includes("..") &&
    !path.startsWith("/") &&
    /^[a-z0-9][a-z0-9._/-]+\.(svg|png|jpe?g|webp)$/i.test(path)
  );
}

export async function POST(request: Request) {
  const access =
    await checkCurriculumDeveloperFromRequest(request);

  if (!access.isCurriculumDeveloper) {
    return json({ error: access.error }, 403);
  }

  try {
    const form = await request.formData();

    const file = form.get("file");
    const bucket = String(form.get("bucket") || "").trim();
    const storagePath = String(
      form.get("storage_path") || "",
    ).trim();
    const subjectValue = String(
      form.get("subject") || "",
    )
      .trim()
      .toLowerCase();
    const level = Number(form.get("level"));

    if (!(file instanceof File)) {
      return json({ error: "Missing asset file." }, 400);
    }

    if (!isDeploymentSubject(subjectValue)) {
      return json({ error: "Unsupported subject." }, 400);
    }

    const subject = subjectValue;
    const expectedBucket = STORAGE_BUCKETS[subject];

    if (bucket !== expectedBucket) {
      return json(
        {
          error:
            `Unsupported storage bucket for ${subject}. ` +
            `Expected ${expectedBucket}.`,
        },
        400,
      );
    }

    if (
      !Number.isInteger(level) ||
      level < 1 ||
      level > 6
    ) {
      return json(
        { error: "Invalid primary level." },
        400,
      );
    }

    if (!validPath(storagePath, subject, level)) {
      return json(
        { error: "Invalid asset storage path." },
        400,
      );
    }

    if (
      file.size <= 0 ||
      file.size > MAX_FILE_BYTES
    ) {
      return json(
        { error: "Asset file size is invalid." },
        400,
      );
    }

    const lowerPath = storagePath.toLowerCase();

    const inferredContentType = lowerPath.endsWith(".svg")
      ? "image/svg+xml"
      : lowerPath.endsWith(".png")
        ? "image/png"
        : /\.jpe?g$/i.test(lowerPath)
          ? "image/jpeg"
          : lowerPath.endsWith(".webp")
            ? "image/webp"
            : "application/octet-stream";

    const contentType =
      file.type || inferredContentType;

    if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
      return json(
        {
          error: `Unsupported asset type: ${contentType}`,
        },
        400,
      );
    }

    const admin = createAdminClient();
    const bytes = new Uint8Array(
      await file.arrayBuffer(),
    );

    const { data, error } = await admin.storage
      .from(expectedBucket)
      .upload(storagePath, bytes, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      return json(
        {
          error: error.message,
          storage_path: storagePath,
        },
        502,
      );
    }

    return json({
      ok: true,
      subject,
      bucket: expectedBucket,
      storage_path: data.path,
      bytes: file.size,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Asset upload failed.",
      },
      500,
    );
  }
}
