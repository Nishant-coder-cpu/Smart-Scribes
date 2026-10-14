import { describe, expect, it } from "vitest";
import { normalizeContentData, parseStorageUrl, toBrowserUrl } from "../lecture-normalize";

describe("parseStorageUrl", () => {
  it("parses gs:// and public https URLs, decoding the path", () => {
    expect(parseStorageUrl("gs://b/courses/x/a b.mp4")).toEqual({ bucket: "b", path: "courses/x/a b.mp4" });
    expect(parseStorageUrl("https://storage.googleapis.com/b/courses/x/a%20b.mp4")).toEqual({
      bucket: "b",
      path: "courses/x/a b.mp4",
    });
    expect(parseStorageUrl("https://example.com/video.mp4")).toBeNull();
  });
});

describe("toBrowserUrl", () => {
  it("routes our own bucket through the signed media endpoint", () => {
    expect(toBrowserUrl("gs://smart-scribes/courses/ic-112/lectures/1/video.mp4", "smart-scribes")).toBe(
      "/api/media?path=courses%2Fic-112%2Flectures%2F1%2Fvideo.mp4"
    );
  });

  it("converts other buckets to playable https URLs", () => {
    expect(toBrowserUrl("gs://other/courses/a b.mp4", "smart-scribes")).toBe(
      "https://storage.googleapis.com/other/courses/a%20b.mp4"
    );
  });

  it("passes through unrelated URLs and empty values", () => {
    expect(toBrowserUrl("https://cdn.example.com/x.png", "smart-scribes")).toBe("https://cdn.example.com/x.png");
    expect(toBrowserUrl(null)).toBe("");
  });
});

describe("normalizeContentData", () => {
  it("maps the pipeline's topic array into sections and animations", () => {
    const result = normalizeContentData([
      {
        topic: "Partitioning",
        details: "Lomuto vs Hoare.",
        question: "Why does pivot choice matter?",
        book_references: [
          "course_book, Page 12 (Relevance: 45.00%)",
          "https://storage.googleapis.com/other/courses/ic-112/lectures/1/Images/page_12img1.png",
        ],
        animations: [
          { title: "Partition demo", video: "gs://other/courses/ic-112/lectures/1/Animations/anim_01.mp4" },
          { title: "Failed render", video: null },
        ],
      },
      { topic: "Complexity", details: "O(n log n) on average.", question: "", book_references: [], animations: [] },
    ]);

    expect(result.content.map((s) => s.title)).toEqual(["Partitioning", "Complexity"]);
    expect(result.content[0].professorNote).toBe("Think about it: Why does pivot choice matter?");
    expect(result.content[0].bookReference).toBe("course_book, Page 12 (Relevance: 45.00%)");
    expect(result.content[0].image).toMatch(/page_12img1\.png$/);
    expect(result.content[1].professorNote).toBeUndefined();
    expect(result.animations).toHaveLength(1);
    expect(result.animations[0].thumbnail).toBe(
      "https://storage.googleapis.com/other/courses/ic-112/lectures/1/Animations/anim_01.mp4"
    );
    expect(result.textReferences).toEqual(["course_book, Page 12 (Relevance: 45.00%)"]);
  });

  it("keeps hand-authored object content as is", () => {
    const result = normalizeContentData({ content: [{ id: "1", title: "T" }], examples: [], doubts: [], animations: [] });
    expect(result.content).toHaveLength(1);
    expect(result.animations).toEqual([]);
  });
});
