import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

// Force Node.js runtime for Cloudinary SDK
export const runtime = "nodejs";
export const maxDuration = 30; // allow up to 30s for upload

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
  "text/csv",
  "application/zip",
  "video/mp4",
  "video/webm",
  "audio/mpeg",
  "audio/wav",
];

const MAX_SIZE = 4.5 * 1024 * 1024; // 4.5 MB (Vercel serverless limit)

// POST /api/upload — uploads a file to Cloudinary, returns { url, publicId }
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "File type not allowed" }, { status: 400 });
    }

    if (file.size > MAX_SIZE) {
      return NextResponse.json({ error: "File too large (max 4.5 MB)" }, { status: 400 });
    }

    // Convert to base64 data URI — more reliable than streams on Vercel serverless
    const bytes = await file.arrayBuffer();
    const base64 = Buffer.from(bytes).toString("base64");
    const dataUri = `data:${file.type};base64,${base64}`;

    // Determine resource type for Cloudinary
    const resourceType: "image" | "video" | "raw" = file.type.startsWith("image/")
      ? "image"
      : file.type.startsWith("video/") || file.type.startsWith("audio/")
      ? "video"
      : "raw";

    // Upload using base64 (no streams — works reliably on serverless)
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      return NextResponse.json(
        { error: `Cloudinary env vars missing: name=${!!cloudName} key=${!!apiKey} secret=${!!apiSecret}` },
        { status: 500 }
      );
    }

    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret });

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "campus-gigs",
      resource_type: resourceType,
      use_filename: true,
      unique_filename: true,
    });

    return NextResponse.json(
      { url: result.secure_url, publicId: result.public_id },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Error uploading to Cloudinary:", error);
    // Cloudinary errors are plain objects, not Error instances
    let message = "Upload failed";
    if (error instanceof Error) {
      message = error.message;
    } else if (typeof error === "object" && error !== null) {
      const e = error as Record<string, unknown>;
      message = (e.message as string) || (e.error as Record<string, unknown>)?.message as string || JSON.stringify(error);
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
