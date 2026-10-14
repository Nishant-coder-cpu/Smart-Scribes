import { getLLM, messageText } from "./llm";
import { AIMessage, BaseMessage, HumanMessage, SystemMessage } from "@langchain/core/messages";
import { googleSearch, isWebSearchConfigured } from "./web-search";

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

// Keep prompts bounded: lecture JSON can be large and history grows per turn.
const MAX_LECTURE_CHARS = 30_000;
const MAX_HISTORY_TURNS = 10;
export const SEARCH_SENTINEL = "SEARCH_NEEDED";

const TUTOR_PERSONA =
  "You are Smart Scribes, a friendly and rigorous AI tutor for college courses. " +
  "Explain clearly, use step-by-step reasoning for maths, and format answers in Markdown. " +
  "Write maths in LaTeX using $...$ for inline and $$...$$ for display equations.";

function historyMessages(history: ChatTurn[]): BaseMessage[] {
  return history
    .slice(-MAX_HISTORY_TURNS)
    .map((turn) =>
      turn.role === "assistant" ? new AIMessage(turn.content) : new HumanMessage(turn.content)
    );
}

/**
 * Decide from the start of a streamed reply whether the model asked for a web
 * search (it replies with exactly SEARCH_SENTINEL) or is answering directly.
 * 'undecided' means the text so far could still turn out to be the sentinel.
 */
export function classifySearchPrefix(textSoFar: string): "search" | "answer" | "undecided" {
  const trimmed = textSoFar.trimStart();
  if (trimmed.startsWith(SEARCH_SENTINEL)) return "search";
  if (trimmed.length === 0 || SEARCH_SENTINEL.startsWith(trimmed)) return "undecided";
  return "answer";
}

async function* streamText(llm: ReturnType<typeof getLLM>, messages: BaseMessage[]) {
  const stream = await llm.stream(messages);
  for await (const chunk of stream) {
    const text = messageText(chunk);
    if (text) yield text;
  }
}

/**
 * Stream the tutor's answer as text chunks. Grounded in the lecture notes when
 * given; falls back to Google search when the model says the notes (or its own
 * knowledge) are not enough and search is configured.
 */
export async function* streamResponse(
  query: string,
  options: { lectureContent?: string | null; history?: ChatTurn[] } = {}
): AsyncGenerator<string> {
  const llm = getLLM(undefined, 0.7);
  const history = historyMessages(options.history ?? []);
  const canSearch = isWebSearchConfigured();
  const lectureContent = options.lectureContent?.slice(0, MAX_LECTURE_CHARS);

  let system = TUTOR_PERSONA;
  if (lectureContent) {
    system +=
      "\n\nAnswer primarily from the lecture notes below. If they don't cover the question, " +
      (canSearch
        ? `reply with exactly "${SEARCH_SENTINEL}" and nothing else.`
        : "answer from general knowledge and say briefly that it goes beyond this lecture.") +
      `\n\nLECTURE NOTES:\n${lectureContent}`;
  } else if (canSearch) {
    system +=
      `\n\nIf the question needs current information (schedules, deadlines, recent events) ` +
      `or facts you are unsure about, reply with exactly "${SEARCH_SENTINEL}" and nothing else.`;
  }

  const firstPass = streamText(llm, [new SystemMessage(system), ...history, new HumanMessage(query)]);

  if (!canSearch) {
    yield* firstPass;
    return;
  }

  // Hold back only the first few characters until we know it isn't the sentinel.
  let buffer = "";
  let decision: "search" | "answer" | "undecided" = "undecided";
  for await (const text of firstPass) {
    if (decision === "answer") {
      yield text;
      continue;
    }
    buffer += text;
    decision = classifySearchPrefix(buffer);
    if (decision === "search") break; // stops the first stream
    if (decision === "answer") yield buffer;
  }
  // 'undecided' at the end means an empty reply or a cut-off sentinel: search too.
  if (decision === "answer") return;

  const searchResults = await googleSearch(query, 3);
  const groundedSystem =
    TUTOR_PERSONA +
    (searchResults
      ? `\n\nUse these web search results where relevant and cite the sources you use:\n${searchResults}`
      : "\n\nWeb search returned nothing useful; answer from general knowledge and say so.");

  yield* streamText(llm, [new SystemMessage(groundedSystem), ...history, new HumanMessage(query)]);
}
