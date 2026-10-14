import { describe, expect, it } from "vitest";
import { getGcpProjectId, isAllowedMediaPath, parseByteRange, publicObjectUrl, safePathSegment } from "../gcp";
import { parseLectureNumber } from "../jobs";
import { makeLectureId } from "../ids";

describe("safePathSegment", () => {
  it("strips separators and traversal", () => {
    expect(safePathSegment("ic-112", "x")).toBe("ic-112");
    expect(safePathSegment("../../etc/passwd", "x")).toBe("_.._etc_passwd");
    expect(safePathSegment("", "fallback")).toBe("fallback");
    expect(safePathSegment("..", "fallback")).toBe("fallback");
  });
});

describe("isAllowedMediaPath", () => {
  it("allows only course media paths", () => {
    expect(isAllowedMediaPath("courses/ic-112/lectures/1/video.mp4")).toBe(true);
    expect(isAllowedMediaPath("secrets/key.json")).toBe(false);
    expect(isAllowedMediaPath("courses/../secrets/key.json")).toBe(false);
    expect(isAllowedMediaPath("courses//x")).toBe(false);
    expect(isAllowedMediaPath("courses/x\\y")).toBe(false);
    expect(isAllowedMediaPath("courses/")).toBe(false);
    expect(isAllowedMediaPath(null)).toBe(false);
  });
});

describe("publicObjectUrl", () => {
  it("encodes each path segment", () => {
    expect(publicObjectUrl("b", "courses/a b/c#d.mp4")).toBe(
      "https://storage.googleapis.com/b/courses/a%20b/c%23d.mp4"
    );
  });
});

describe("getGcpProjectId", () => {
  it("prefers the service-account project over a stale environment project", () => {
    const originalProjectId = process.env.GCP_PROJECT_ID;
    process.env.GCP_PROJECT_ID = "stale-project-number";

    try {
      expect(getGcpProjectId({ project_id: "service-account-project" })).toBe("service-account-project");
    } finally {
      if (originalProjectId === undefined) delete process.env.GCP_PROJECT_ID;
      else process.env.GCP_PROJECT_ID = originalProjectId;
    }
  });
});

describe("parseByteRange", () => {
  it("parses bounded, open-ended, and suffix ranges", () => {
    expect(parseByteRange("bytes=2-5", 10)).toEqual({ start: 2, end: 5 });
    expect(parseByteRange("bytes=8-", 10)).toEqual({ start: 8, end: 9 });
    expect(parseByteRange("bytes=-4", 10)).toEqual({ start: 6, end: 9 });
  });

  it("clamps ranges at the end of the object and rejects invalid ranges", () => {
    expect(parseByteRange("bytes=5-20", 10)).toEqual({ start: 5, end: 9 });
    expect(parseByteRange("bytes=10-", 10)).toBe("invalid");
    expect(parseByteRange("bytes=0-1,4-5", 10)).toBe("invalid");
    expect(parseByteRange("bytes=-0", 10)).toBe("invalid");
    expect(parseByteRange(null, 10)).toBeNull();
  });
});

describe("lecture ids", () => {
  it("normalizes lecture numbers so '01' and 1 map to the same lecture", () => {
    expect(parseLectureNumber("01")).toBe(1);
    expect(parseLectureNumber(3)).toBe(3);
    expect(parseLectureNumber("0")).toBeNull();
    expect(parseLectureNumber("2.5")).toBeNull();
    expect(parseLectureNumber("abc")).toBeNull();
    expect(makeLectureId("ic-112", parseLectureNumber("01")!)).toBe("ic112-l1");
  });
});
