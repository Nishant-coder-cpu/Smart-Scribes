import { randomUUID } from "crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { makeLectureId } from "./ids";

export interface EnqueueLectureJobInput {
  courseId: string;
  lectureNumber: number;
  lectureDate?: string;
  audioUrl: string;
  videoUrl: string;
}

/** Parse a lecture number like "3" or "03"; returns null if it is not a positive integer. */
export function parseLectureNumber(value: unknown): number | null {
  const n = Number(String(value ?? "").trim());
  return Number.isInteger(n) && n > 0 ? n : null;
}

/**
 * Queue a lecture for the Python worker (Python_Codes/worker.py).
 *
 * The worker only picks up rows with status 'pending'. The parent `lectures`
 * row is created first if needed, because lectures_processing.lecture_id has
 * a foreign key to it.
 */
export async function enqueueLectureJob(
  supabase: SupabaseClient,
  input: EnqueueLectureJobInput
): Promise<{ jobId: string; lectureId: string }> {
  const lectureId = makeLectureId(input.courseId, input.lectureNumber);

  const { data: existing, error: lookupError } = await supabase
    .from("lectures")
    .select("id")
    .eq("id", lectureId)
    .maybeSingle();
  if (lookupError) throw lookupError;

  if (!existing) {
    const { error: lectureError } = await supabase.from("lectures").insert({
      id: lectureId,
      number: input.lectureNumber,
      date: input.lectureDate || new Date().toISOString().slice(0, 10),
      topic: `Lecture ${input.lectureNumber}`,
      course_id: input.courseId,
    });
    if (lectureError) throw lectureError;
  }

  const jobId = `proc_${randomUUID()}`;
  const { error: jobError } = await supabase.from("lectures_processing").insert({
    id: jobId,
    lecture_id: lectureId,
    status: "pending",
    stage: "queued",
    progress: 0,
    audio_file: input.audioUrl,
    video_file: input.videoUrl,
  });
  if (jobError) throw jobError;

  return { jobId, lectureId };
}
