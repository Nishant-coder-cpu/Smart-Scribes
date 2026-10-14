import { LectureContent } from '../types';

/**
 * Plain-text version of a lecture, used as grounding context for the AI tutor
 * and the quiz generator. Much more compact and readable for the model than
 * the raw JSON.
 */
export function lectureToPlainText(content: LectureContent | null | undefined): string {
  if (!content) return '';

  const parts: string[] = [`Lecture topic: ${content.topic}`];
  if (content.definition) parts.push(`Definition: ${content.definition}`);

  for (const section of content.content) {
    parts.push(`## ${section.title}\n${section.content}`);
    if (section.professorNote) parts.push(`Note: ${section.professorNote}`);
    if (section.bookReference) parts.push(`Textbook: ${section.bookReference}`);
  }

  for (const example of content.examples) {
    parts.push(`Example: ${example.title}\nProblem: ${example.problem}\nSolution: ${example.solution}`);
  }

  if (content.bookReference) parts.push(`Book references:\n${content.bookReference}`);
  return parts.join('\n\n');
}
