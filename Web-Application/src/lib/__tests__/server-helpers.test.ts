import { describe, expect, it } from "vitest";
import { isAllowedMediaPath, publicObjectUrl, safePathSegment } from "../gcp";
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
