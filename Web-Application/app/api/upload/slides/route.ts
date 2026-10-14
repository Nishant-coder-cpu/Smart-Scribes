import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { createAdminClient } from "@/utils/supabase/server";
import { getBucketName, getStorage, publicObjectUrl, safePathSegment } from "@/lib/gcp";
import { makeLectureId } from "@/lib/ids";
import { parseLectureNumber } from "@/lib/jobs";

export const runtime = "nodejs";

const MAX_SLIDES_BYTES = 50 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const slidesFile = formData.get("file");
    const rawCourseId = (formData.get("courseId") as string) || "";
    const lectureNumber = parseLectureNumber(formData.get("lectureNumber"));
    const slideDate = safePathSegment(formData.get("date"), "");

    if (!(slidesFile instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!rawCourseId) {
      return NextResponse.json({ error: "courseId is required" }, { status: 400 });
    }
    const isPdf =
      slidesFile.type === "application/pdf" || slidesFile.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Slides must be a PDF file" }, { status: 400 });
    }
    if (slidesFile.size > MAX_SLIDES_BYTES) {
      return NextResponse.json({ error: "Slides PDF must be 50 MB or smaller" }, { status: 400 });
    }

    const bucketName = getBucketName();
    const courseId = safePathSegment(rawCourseId, "unknown-course");

    // The pipeline looks for "lecture<N>_" at the start of the name to pick the
    // PDF that belongs to a specific lecture (see download_book in Python_Codes).
    const safeBaseName = slidesFile.name.replace(/[^a-zA-Z0-9_.-]/g, "_");
    let slideMetaPrefix = lectureNumber ? `lecture${lectureNumber}` : "";
    slideMetaPrefix += slideDate ? `_${slideDate}` : "";
    if (slideMetaPrefix) slideMetaPrefix += "_";
    const dest = `courses/${courseId}/slides/${slideMetaPrefix}_${safeBaseName}`;

    const arrayBuffer = await slidesFile.arrayBuffer();
    await getStorage().bucket(bucketName).file(dest).save(Buffer.from(arrayBuffer), {
      resumable: false,
      contentType: "application/pdf",
      metadata: { cacheControl: "public, max-age=31536000" },
    });
    const url = publicObjectUrl(bucketName, dest);

    // Record the slide against its lecture so Slides Management can list it.
    // Skipped (not an error) when the lecture row does not exist yet.
    let recorded = false;
    if (lectureNumber) {
      const supabase = createAdminClient();
      const lectureId = makeLectureId(rawCourseId, lectureNumber);
      const { data: lecture } = await supabase
        .from("lectures")
        .select("id")
        .eq("id", lectureId)
        .maybeSingle();
      if (lecture) {
        const { error } = await supabase.from("slides").insert({
          id: `slide_${randomUUID()}`,
          lecture_id: lectureId,
          file_name: slidesFile.name,
          file_path: url,
        });
        if (error) console.error("Failed to record slide in database:", error);
        recorded = !error;
      }
    }

    return NextResponse.json({ url, path: dest, recorded });
  } catch (error: any) {
    console.error("Slides upload failed:", error);
    return NextResponse.json(
      { error: error?.message || "Slides upload failed" },
      { status: 500 }
    );
  }
}
