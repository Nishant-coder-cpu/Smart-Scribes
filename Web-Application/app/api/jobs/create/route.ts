import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { enqueueLectureJob, parseLectureNumber } from "@/lib/jobs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, lectureDate, audioUrl, videoUrl } = body;
    const lectureNumber = parseLectureNumber(body.lectureNumber);

    if (!courseId || !audioUrl || !videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields (courseId, lectureNumber, audioUrl, videoUrl)" },
        { status: 400 }
      );
    }
    if (lectureNumber === null) {
      return NextResponse.json(
        { error: "lectureNumber must be a positive whole number" },
        { status: 400 }
      );
    }

    const supabase = createClient();
    const { jobId, lectureId } = await enqueueLectureJob(supabase, {
      courseId,
      lectureNumber,
      lectureDate,
      audioUrl,
      videoUrl,
    });

    return NextResponse.json({ success: true, jobId, lectureId });
  } catch (error: any) {
    console.error("Failed to create job:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create job" },
      { status: 500 }
    );
  }
}
