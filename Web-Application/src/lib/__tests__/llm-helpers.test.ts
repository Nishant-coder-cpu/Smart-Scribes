import { afterEach, describe, expect, it, vi } from "vitest";
import { classifySearchPrefix } from "../langchain-agent";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { getGeminiModel, getLLM, messageText, shouldUseVertexAI } from "../llm";
import { normalizeMathDelimiters } from "../markdown-math";
import { parseQuestionsFromResponse } from "../qna-generator";
import { lectureToPlainText } from "../lecture-text";

afterEach(() => vi.unstubAllEnvs());

describe("classifySearchPrefix", () => {
  it("waits while the reply could still be the search sentinel", () => {
    expect(classifySearchPrefix("")).toBe("undecided");
    expect(classifySearchPrefix("  SEARCH_")).toBe("undecided");
    expect(classifySearchPrefix("SEARCH_NEEDED")).toBe("search");
    expect(classifySearchPrefix("SEARCH_NEEDED\n")).toBe("search");
  });

  it("streams immediately once the reply is clearly an answer", () => {
    expect(classifySearchPrefix("Sure")).toBe("answer");
    expect(classifySearchPrefix("SEARCHING the notes")).toBe("answer");
  });
});

describe("messageText", () => {
  it("extracts text from string and block content", () => {
    expect(messageText({ content: "hi" })).toBe("hi");
    expect(
      messageText({ content: [{ type: "reasoning", reasoning: "..." }, { type: "text", text: "answer" }] })
    ).toBe("answer");
  });
});

describe("shouldUseVertexAI", () => {
  it("prefers the Gemini API key unless Vertex is explicitly selected", () => {
    expect(shouldUseVertexAI("test-api-key", undefined)).toBe(false);
    expect(shouldUseVertexAI("test-api-key", "vertex")).toBe(true);
    expect(shouldUseVertexAI(undefined, undefined)).toBe(true);
    expect(shouldUseVertexAI("test-api-key", "api-key")).toBe(false);
  });

  it("rejects unsupported Gemini transports", () => {
    expect(() => shouldUseVertexAI("test-api-key", "unknown")).toThrow(
      "GEMINI_TRANSPORT must be 'api-key' or 'vertex'."
    );
  });

  it("does not let storage credentials override a configured Gemini API key", () => {
    vi.stubEnv("GEMINI_API_KEY", "test-api-key");
    vi.stubEnv("GEMINI_MODEL", "gemini-3.8-flash");
    vi.stubEnv("GOOGLE_APPLICATION_CREDENTIALS", "storage-service-account.json");
    vi.stubEnv("GEMINI_TRANSPORT", "");

    expect(getLLM("gemini")).toBeInstanceOf(ChatGoogleGenerativeAI);
  });
});

describe("getGeminiModel", () => {
  it("defaults to Gemini 2.5 Flash and keeps explicit model configuration", () => {
    expect(getGeminiModel(undefined)).toBe("gemini-2.5-flash");
    expect(getGeminiModel("gemini-3.8-flash")).toBe("gemini-3.8-flash");
    expect(getGeminiModel("  gemini-2.5-flash  ")).toBe("gemini-2.5-flash");
  });
});

describe("normalizeMathDelimiters", () => {
  it("converts \\( \\) and \\[ \\] but leaves code alone", () => {
    expect(normalizeMathDelimiters("Area \\(\\pi r^2\\)")).toBe("Area $\\pi r^2$");
    expect(normalizeMathDelimiters("\\[E = mc^2\\]")).toContain("$$\nE = mc^2\n$$");
    expect(normalizeMathDelimiters("`\\(x\\)`")).toBe("`\\(x\\)`");
  });
});

describe("parseQuestionsFromResponse", () => {
  it("keeps only well-formed MCQs and assigns unique ids", () => {
    const raw =
      "```json\n" +
      JSON.stringify([
        { id: "unique_id", question: "Q1?", options: ["a", "b"], correct: 1, explanation: "e" },
        { id: "unique_id", question: "Q2?", options: ["a", "b"], correct: 5 },
        { question: "Q3?" },
      ]) +
      "\n```";
    const questions = parseQuestionsFromResponse(raw, "mcq");
    expect(questions.map((q) => q.question)).toEqual(["Q1?"]);
    expect(questions[0].id).not.toBe("unique_id");
  });

  it("returns [] for unparseable output", () => {
    expect(parseQuestionsFromResponse("I cannot help with that", "subjective")).toEqual([]);
  });
});

describe("lectureToPlainText", () => {
  it("renders a compact text version of a lecture", () => {
    const text = lectureToPlainText({
      lectureId: "l1",
      topic: "QuickSort",
      definition: "",
      recordingUrl: "",
      bookReference: "",
      content: [{ id: "1", type: "concept", title: "Pivot", content: "Choose a pivot." }],
      doubts: [],
      examples: [],
      animations: [],
    });
    expect(text).toContain("Lecture topic: QuickSort");
    expect(text).toContain("## Pivot\nChoose a pivot.");
  });
});
