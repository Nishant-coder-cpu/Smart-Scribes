import { NextRequest, NextResponse } from "next/server";
import { Readable } from "node:stream";
import { getBucketName, getStorage, isAllowedMediaPath, parseByteRange, signedReadUrl } from "@/lib/gcp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Signed URLs live for an hour; browsers may reuse the redirect for most of that.
const SIGNED_URL_TTL_MS = 60 * 60 * 1000;
const REDIRECT_CACHE_SECONDS = 50 * 60;

/**
 * GET /api/media?path=courses/<course>/lectures/<n>/video.mp4
 *
 * Redirects to a short-lived signed URL so lecture media can be served from a
 * private bucket. <video>/<img> follow the redirect, and range requests for
 * seeking go straight to Cloud Storage.
 */
export async function GET(request: NextRequest) {
  const path = request.nextUrl.searchParams.get("path");
  if (!isAllowedMediaPath(path)) {
    return NextResponse.json({ error: "Invalid media path" }, { status: 400 });
  }

  let bucketName: string;
  try {
    bucketName = getBucketName();
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Storage is not configured" }, { status: 500 });
  }

  let target: string;
  try {
    target = await signedReadUrl(bucketName, path, SIGNED_URL_TTL_MS);
  } catch (error) {
    // Some service accounts can read objects but cannot sign URLs. Stream the
    // object through this route in that case instead of exposing a private URL.
    console.error("Could not sign media URL; streaming from Cloud Storage:", error);
    try {
      const file = getStorage().bucket(bucketName).file(path);
      const [metadata] = await file.getMetadata();
      const size = Number(metadata.size);
      const byteRange = parseByteRange(request.headers.get("range"), size);

      if (byteRange === "invalid") {
        return new NextResponse(null, {
          status: 416,
          headers: { "Content-Range": `bytes */${size}`, "Accept-Ranges": "bytes" },
        });
      }

      const headers = new Headers({
        "Accept-Ranges": "bytes",
        "Cache-Control": "private, max-age=3600",
        "Content-Length": String(byteRange ? byteRange.end - byteRange.start + 1 : size),
        "Content-Type": metadata.contentType || "application/octet-stream",
      });
      const status = byteRange ? 206 : 200;
      if (byteRange) {
        headers.set("Content-Range", `bytes ${byteRange.start}-${byteRange.end}/${size}`);
      }

      const stream = file.createReadStream(byteRange || undefined);
      return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, { status, headers });
    } catch (streamError: any) {
      console.error("Could not stream media from Cloud Storage:", streamError);
      return NextResponse.json(
        { error: streamError?.message || "Unable to read media from Cloud Storage" },
        { status: 502 }
      );
    }
  }

  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", `private, max-age=${REDIRECT_CACHE_SECONDS}`);
  return response;
}
