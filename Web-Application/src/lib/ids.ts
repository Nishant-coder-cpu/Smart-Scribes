/**
 * Canonical lecture ID shared by the web app and the Python pipeline.
 *
 * Format matches the seed data in supabase_schema.sql:
 *   makeLectureId('ic-112', 1) -> 'ic112-l1'
 *
 * Keep in sync with make_lecture_id() in Python_Codes/config.py.
 */
export function makeLectureId(courseId: string, lectureNumber: number | string): string {
  return `${courseId.replace(/-/g, '')}-l${lectureNumber}`
}
