import { NextRequest, NextResponse } from "next/server";
import Busboy from "busboy";
import { Readable } from "stream";
import { createClient } from "@/utils/supabase/server";
import { getBucketName, getStorage, publicObjectUrl, safePathSegment } from "@/lib/gcp";
import { enqueueLectureJob, parseLectureNumber } from "@/lib/jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

// Server-proxied upload (multipart/form-data with fields courseId, lectureNumber,
// lectureDate and files "audio" + "video"). The web UI uses the direct-to-GCS
// flow in /api/upload/init instead; this route is kept for scripts/clients that
// cannot do resumable uploads.

async function uploadStreamToGCS(params: {
  bucketName: string;
  destinationPath: string;
  stream: NodeJS.ReadableStream;
  contentType?: string | null;
}) {
  const { bucketName, destinationPath, stream, contentType } = params;
  const file = getStorage().bucket(bucketName).file(destinationPath);

  const writeStream = file.createWriteStream({
    resumable: true,
    contentType: contentType ?? undefined,
    metadata: { cacheControl: "public, max-age=31536000" },
  });

  await new Promise<void>((resolve, reject) => {
    stream.pipe(writeStream);
    writeStream.on("finish", () => resolve());
    writeStream.on("error", reject);
    stream.on("error", reject);
  });

  return publicObjectUrl(bucketName, destinationPath);
}

export async function POST(request: NextRequest) {
  try {
    const bucketName = getBucketName();

    const contentType = request.headers.get("content-type") || "";
    if (!contentType.startsWith("multipart/form-data")) {
      return NextResponse.json(
        { error: "Content-Type must be multipart/form-data" },
        { status: 400 }
      );
    }

    const fields: Record<string, string> = {};
    let audioUrl: string | undefined;
    let videoUrl: string | undefined;
    // Assigned inside the busboy callback, so declare it without narrowing to null.
    let formError = null as string | null;
    const promises: Promise<void>[] = [];

    const bb = Busboy({ headers: { "content-type": contentType } });

    bb.on("field", (name, val) => {
      fields[name] = val;
    });

    bb.on("file", (name, file, info) => {
      const { filename, mimeType } = info;
      const lectureNumber = parseLectureNumber(fields.lectureNumber);

      // Busboy streams parts in order, so the text fields must come before the files.
      if (!fields.courseId || lectureNumber === null) {
        formError = "Send courseId and lectureNumber fields before the audio/video files.";
        file.resume();
        return;
      }
      if (name !== "audio" && name !== "video") {
        file.resume();
        return;
      }

      const courseId = safePathSegment(fields.courseId, "unknown-course");
      const ext = safePathSegment(filename?.split(".").pop()?.toLowerCase(), "bin");
      const destinationPath = `courses/${courseId}/lectures/${lectureNumber}/${name}.${ext}`;

      const p = uploadStreamToGCS({
        bucketName,
        destinationPath,
        stream: file,
        contentType: mimeType,
      }).then((url) => {
        if (name === "audio") audioUrl = url; else videoUrl = url;
      });
      promises.push(p);
    });

    const nodeReadable = Readable.fromWeb(request.body as any);
    await new Promise<void>((resolve, reject) => {
      nodeReadable.pipe(bb);
      bb.on("close", resolve);
      bb.on("error", reject);
      nodeReadable.on("error", reject);
    });

    await Promise.all(promises);

    if (formError) {
      return NextResponse.json({ error: formError }, { status: 400 });
    }
    if (!audioUrl || !videoUrl) {
      return NextResponse.json(
        { error: "Both audio and video files are required" },
        { status: 400 }
      );
    }

    const courseId = fields.courseId;
    const lectureNumber = parseLectureNumber(fields.lectureNumber)!;
    const lectureDate = fields.lectureDate || "";

    const supabase = createClient();
    const { jobId, lectureId } = await enqueueLectureJob(supabase, {
      courseId,
      lectureNumber,
      lectureDate,
      audioUrl,
      videoUrl,
    });

    return NextResponse.json({
      success: true,
      jobId,
      lectureId,
      audioUrl,
      videoUrl,
      courseId,
      lectureNumber,
      lectureDate,
      pathPrefix: `courses/${safePathSegment(courseId, "unknown-course")}/lectures/${lectureNumber}`,
    });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: error?.message || "Upload failed" },
      { status: 500 }
    );
  }
}
