import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { makeLectureId } from "@/lib/ids";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseId, lectureNumber, audioUrl, videoUrl } = body;

    if (!courseId || !lectureNumber || !audioUrl || !videoUrl) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const lectureId = makeLectureId(courseId, lectureNumber);
    const jobId = `proc_${Date.now()}`;
    const supabase = createClient();

    const { error: dbError } = await supabase.from("lectures_processing").insert({
      id: jobId,
      lecture_id: lectureId,
      status: "pending",
      stage: "queued",
      progress: 0,
      audio_file: audioUrl,
      video_file: videoUrl
    });

    if (dbError) {
      console.error("Failed to insert job into Supabase:", dbError);
      return NextResponse.json({ error: dbError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, jobId, lectureId });
  } catch (error: any) {
    console.error("Failed to create job:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
