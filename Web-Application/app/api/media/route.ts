import { NextRequest, NextResponse } from "next/server";
import { getBucketName, isAllowedMediaPath, publicObjectUrl, signedReadUrl } from "@/lib/gcp";

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
    // Credentials that can't sign (e.g. no private key): fall back to the
    // public URL, which still works while the bucket is publicly readable.
    console.error("Could not sign media URL, falling back to public URL:", error);
    target = publicObjectUrl(bucketName, path);
  }

  const response = NextResponse.redirect(target, 302);
  response.headers.set("Cache-Control", `private, max-age=${REDIRECT_CACHE_SECONDS}`);
  return response;
}
