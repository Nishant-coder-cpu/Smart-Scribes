import fs from "fs";
import path from "path";
import { Storage } from "@google-cloud/storage";

/**
 * Server-only helpers for Google Cloud credentials and Storage.
 *
 * Credentials are read from, in order:
 *   1. GOOGLE_APPLICATION_CREDENTIALS_JSON (raw JSON or base64 of the JSON)
 *   2. GOOGLE_APPLICATION_CREDENTIALS      (path to the JSON key file)
 *   3. GCP_CLIENT_EMAIL + GCP_PRIVATE_KEY
 */
export function loadGcpCredentials(): Record<string, any> | null {
  const jsonEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
  const jsonPathEnv = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const clientEmailEnv = process.env.GCP_CLIENT_EMAIL;
  const privateKeyEnv = process.env.GCP_PRIVATE_KEY;

  let parsed: Record<string, any> | null = null;

  if (jsonEnv) {
    try {
      const maybeDecoded = jsonEnv.trim().startsWith("{")
        ? jsonEnv
        : Buffer.from(jsonEnv, "base64").toString("utf8");
      parsed = JSON.parse(maybeDecoded);
    } catch {
      throw new Error(
        "GOOGLE_APPLICATION_CREDENTIALS_JSON is invalid (provide the JSON, or base64 of the JSON)."
      );
    }
  }

  if (!parsed && jsonPathEnv) {
    const resolved = path.isAbsolute(jsonPathEnv)
      ? jsonPathEnv
      : path.resolve(process.cwd(), jsonPathEnv);
    try {
      parsed = JSON.parse(fs.readFileSync(resolved, "utf8"));
    } catch {
      throw new Error(`GOOGLE_APPLICATION_CREDENTIALS file could not be read or parsed: ${resolved}`);
    }
  }

  if (!parsed && clientEmailEnv && privateKeyEnv) {
    parsed = { client_email: clientEmailEnv, private_key: privateKeyEnv };
  }

  if (parsed && typeof parsed.private_key === "string") {
    parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
  }
  return parsed;
}

export function getGcpProjectId(credentials?: Record<string, any> | null): string | undefined {
  return process.env.GCP_PROJECT_ID || credentials?.project_id;
}

export function getStorage(): Storage {
  const credentials = loadGcpCredentials();
  if (!credentials) {
    throw new Error(
      "Missing GCP credentials. Provide GOOGLE_APPLICATION_CREDENTIALS_JSON, GOOGLE_APPLICATION_CREDENTIALS, or both GCP_CLIENT_EMAIL and GCP_PRIVATE_KEY."
    );
  }
  const projectId = getGcpProjectId(credentials);
  if (!projectId) {
    throw new Error("Missing GCP_PROJECT_ID env var");
  }
  return new Storage({ projectId, credentials });
}

export function getBucketName(): string {
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    throw new Error("Missing GCS_BUCKET_NAME env var");
  }
  return bucketName;
}

/** Public URL for an object in a publicly readable bucket. */
export function publicObjectUrl(bucketName: string, objectPath: string): string {
  const encodedPath = objectPath.split("/").map(encodeURIComponent).join("/");
  return `https://storage.googleapis.com/${bucketName}/${encodedPath}`;
}

/**
 * Make a user-supplied value safe to use as one GCS path segment
 * (no slashes, no "..", no control characters).
 */
export function safePathSegment(value: unknown, fallback: string): string {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/[^a-zA-Z0-9_.-]/g, "_")
    .replace(/^\.+/, "")
    .slice(0, 100);
  return cleaned || fallback;
}

/**
 * Object paths that /api/media may serve: only lecture/course media under
 * "courses/", with no traversal, backslashes, or control characters.
 */
export function isAllowedMediaPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    path.length > "courses/".length &&
    path.length <= 1024 &&
    path.startsWith("courses/") &&
    !path.includes("\\") &&
    !/[\u0000-\u001f\u007f]/.test(path) &&
    !path.split("/").some((seg) => seg === "" || seg === "." || seg === "..")
  );
}

export function parseByteRange(
  rangeHeader: string | null,
  size: number
): { start: number; end: number } | "invalid" | null {
  if (!rangeHeader) return null;
  if (!Number.isSafeInteger(size) || size <= 0) return "invalid";

  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match || (!match[1] && !match[2])) return "invalid";

  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength <= 0) return "invalid";
    start = Math.max(size - suffixLength, 0);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start >= size || end < start) {
      return "invalid";
    }
    end = Math.min(end, size - 1);
  }

  return { start, end };
}

/** V4 signed URL granting temporary read access to one object. */
export async function signedReadUrl(bucketName: string, objectPath: string, ttlMs: number): Promise<string> {
  const [url] = await getStorage()
    .bucket(bucketName)
    .file(objectPath)
    .getSignedUrl({ version: "v4", action: "read", expires: Date.now() + ttlMs });
  return url;
}
