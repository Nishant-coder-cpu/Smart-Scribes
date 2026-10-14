import { getLLM, messageText } from "./llm";
import { googleSearch } from "./web-search";

export type QuestionFormat = "mcq" | "subjective" | "mathematical";

const MAX_TOPIC_SOURCE_CHARS = 8_000;
const MAX_GROUNDING_CHARS = 12_000;

// Prompts are plain strings (not LangChain templates) so that braces in lecture
// text or search results can never be mistaken for template variables.

// Function to recommend topics based on lecture content
export async function recommendTopics(lectureContent: string): Promise<string[]> {
  if (!lectureContent || lectureContent.trim().length === 0) {
    throw new Error("Lecture content is required");
  }

  const llm = getLLM(undefined, 0.7);

  const prompt = `You are an expert educational content analyzer specializing in identifying key topics for assessment.

Analyze the following lecture content and identify 5-7 distinct topics that would be excellent for generating quiz questions.

LECTURE CONTENT:
${lectureContent.substring(0, MAX_TOPIC_SOURCE_CHARS)}

REQUIREMENTS:
1. Topics should be specific and focused (not too broad)
2. Cover different aspects and difficulty levels of the content
3. Include both fundamental concepts and practical applications
4. Be relevant to students learning this material
5. Be suitable for generating assessment questions

CRITICAL: Respond ONLY with a valid JSON array of strings. No explanation, no markdown, just the array.

Example format:
["Topic Name 1", "Topic Name 2", "Topic Name 3", "Topic Name 4", "Topic Name 5"]

JSON Response:`;

  const responseText = messageText(await llm.invoke(prompt)).trim();
  const topics = extractJsonArray(responseText);
  return topics.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
}

const FORMAT_INSTRUCTIONS: Record<QuestionFormat, string> = {
  mcq: `
Generate 3-5 high-quality Multiple Choice Questions (MCQ).

For EACH question, provide:
{
  "id": "unique_id",
  "question": "Clear, specific question text",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correct": 0,
  "explanation": "Detailed explanation of why the correct answer is right and why others are wrong"
}

RULES:
- All 4 options must be plausible
- Only ONE option should be clearly correct
- Correct answer index is 0-based (0=A, 1=B, 2=C, 3=D)
- Explanation should be educational and thorough
- Questions should test understanding, not just memorization`,
  subjective: `
Generate 3-5 thought-provoking Subjective Questions.

For EACH question, provide:
{
  "id": "unique_id",
  "question": "Open-ended question requiring explanation or analysis",
  "solution": "Comprehensive model answer with key points, explanations, and examples"
}

RULES:
- Questions should encourage critical thinking
- Solutions should be detailed and educational
- Include relevant examples and explanations
- Cover different aspects of the topic`,
  mathematical: `
Generate 3-5 Mathematical Problems.

For EACH problem, provide:
{
  "id": "unique_id",
  "question": "Clear mathematical problem statement with necessary information",
  "solution": "Step-by-step solution showing all work and reasoning"
}

RULES:
- Problems should be solvable with provided information
- Solutions must show all steps clearly
- Include formulas and calculations
- Explain the reasoning at each step`,
};

export async function generateQnA(
  topic: string,
  questionFormat: QuestionFormat,
  options: { lectureContent?: string | null; useWebSearch?: boolean } = {}
): Promise<any[]> {
  if (!topic || topic.trim().length === 0) {
    throw new Error("Topic is required");
  }

  const llm = getLLM(undefined, 0.7);

  let reference = "";
  if (options.lectureContent) {
    reference += `Lecture notes (base the questions on what was taught here when relevant):
${options.lectureContent.slice(0, MAX_GROUNDING_CHARS)}

`;
  }
  if (options.useWebSearch) {
    const kind =
      questionFormat === "mcq" ? "multiple choice questions"
        : questionFormat === "subjective" ? "subjective questions"
        : "mathematical problems";
    const searchContext = await googleSearch(`${topic} educational content ${kind}`, 5);
    if (searchContext) {
      reference += `Reference information from web search:
${searchContext}

Use this information to create accurate, well-informed questions.

`;
    }
  }

  const prompt = `You are an expert educational content creator.

Topic: ${topic}

${reference}${FORMAT_INSTRUCTIONS[questionFormat]}

CRITICAL: Respond ONLY with a valid JSON array. No explanation, no markdown, just the array.

JSON Response:`;

  const responseText = messageText(await llm.invoke(prompt));
  return parseQuestionsFromResponse(responseText, questionFormat);
}

function extractJsonArray(responseText: string): unknown[] {
  const cleanedText = responseText.replace(/```json\s*/g, "").replace(/```\s*/g, "");
  const match = cleanedText.match(/\[[\s\S]*\]/);
  if (!match) {
    console.error("No JSON array in LLM response:", responseText);
    return [];
  }
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch (parseError) {
    console.error("Error parsing JSON array:", parseError, "Response was:", responseText);
    return [];
  }
}

// Keep only well-formed questions so the quiz UI never renders a broken item.
export function parseQuestionsFromResponse(responseText: string, format: QuestionFormat): any[] {
  return extractJsonArray(responseText)
    .filter((q: any) => {
      if (!q || typeof q.question !== "string") return false;
      if (format === "mcq") {
        return (
          Array.isArray(q.options) &&
          q.options.length >= 2 &&
          Number.isInteger(q.correct) &&
          q.correct >= 0 &&
          q.correct < q.options.length
        );
      }
      return typeof q.solution === "string";
    })
    .map((q: any, idx) => ({ ...q, id: `${format}_${Date.now()}_${idx + 1}` }));
}
