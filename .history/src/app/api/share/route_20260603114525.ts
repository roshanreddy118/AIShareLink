import { NextRequest, NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { saveLink, SharedLink } from "@/lib/store";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      fileName,
      fileType,
      redactedContent,
      redactedItems,
      expiresIn = 24 * 60 * 60 * 1000, // Default 24 hours
      password,
      maxViews,
    } = body;

    if (!redactedContent || !fileName) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Limit content size (10MB base64)
    if (redactedContent.length > 10 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File too large. Maximum 10MB." },
        { status: 413 }
      );
    }

    const id = uuidv4().slice(0, 8);
    const link: SharedLink = {
      id,
      fileName,
      fileType,
      redactedContent,
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresIn,
      password: password || undefined,
      maxViews: maxViews || undefined,
      views: [],
      redactedItems: redactedItems || [],
    };

    saveLink(link);

    const baseUrl = request.headers.get("host") || "localhost:3000";
    const protocol = request.headers.get("x-forwarded-proto") || "http";
    const shareUrl = `${protocol}://${baseUrl}/view/${id}`;

    return NextResponse.json({
      success: true,
      id,
      url: shareUrl,
      expiresAt: link.expiresAt,
    });
  } catch (error) {
    console.error("Share error:", error);
    return NextResponse.json(
      { error: "Failed to generate share link" },
      { status: 500 }
    );
  }
}
