import { NextRequest, NextResponse } from "next/server";
import { getBucketName, getStorage, safePathSegment } from "@/lib/gcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
      return NextResponse.json(
        { error: "Expected application/json body" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const kind: "audio" | "video" | undefined = body.kind;
    const filename: string = body.filename || "file.bin";
    const type: string | undefined = body.type;

    if (!kind || (kind !== "audio" && kind !== "video")) {
      return NextResponse.json(
        { error: "Provide kind as 'audio' or 'video'" },
        { status: 400 }
      );
    }
    if (type && !type.startsWith(`${kind}/`)) {
      return NextResponse.json(
        { error: `Expected a ${kind} file but got '${type}'` },
        { status: 400 }
      );
    }

    // These values become GCS path segments, so strip anything like "/" or "..".
    const courseId = safePathSegment(body.courseId, "unknown-course");
    const lectureNumber = safePathSegment(body.lectureNumber, "unlabeled");

    const bucket = getStorage().bucket(getBucketName());

    const ext = safePathSegment(filename.split(".").pop()?.toLowerCase(), "bin");
    const basePath = `courses/${courseId}/lectures/${lectureNumber}`;
    const destinationPath = `${basePath}/${kind}.${ext}`;

    const file = bucket.file(destinationPath);
    const [uploadUrl] = await file.createResumableUpload({
      origin: request.headers.get("origin") || undefined,
      metadata: {
        contentType: type || undefined,
        cacheControl: "public, max-age=31536000",
      },
    });

    return NextResponse.json({
      uploadUrl,
      bucketName: bucket.name,
      destinationPath,
      pathPrefix: basePath,
    });
  } catch (error: any) {
    console.error("Failed to init resumable upload:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to init resumable upload" },
      { status: 500 }
    );
  }
}
