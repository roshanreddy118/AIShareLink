import { NextRequest, NextResponse } from "next/server";
import { getLink, recordView, getLinkStats } from "@/lib/store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const link = getLink(id);

  if (!link) {
    return NextResponse.json(
      { error: "Link not found or expired" },
      { status: 404 }
    );
  }

  // Check password if set
  const password = request.nextUrl.searchParams.get("password");
  if (link.password && password !== link.password) {
    return NextResponse.json(
      { error: "Password required", needsPassword: true, fileName: link.fileName },
      { status: 401 }
    );
  }

  // Record view
  const ip = request.headers.get("x-forwarded-for") || 
             request.headers.get("x-real-ip") || 
             "unknown";
  const userAgent = request.headers.get("user-agent") || "unknown";

  const viewAllowed = recordView(id, {
    timestamp: Date.now(),
    ip,
    userAgent,
  });

  if (!viewAllowed) {
    return NextResponse.json(
      { error: "Maximum views reached" },
      { status: 403 }
    );
  }

  return NextResponse.json({
    success: true,
    fileName: link.fileName,
    fileType: link.fileType,
    redactedContent: link.redactedContent,
    redactedItems: link.redactedItems,
    createdAt: link.createdAt,
    expiresAt: link.expiresAt,
  });
}

// Get stats for a link
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const stats = getLinkStats(id);

  if (!stats) {
    return NextResponse.json(
      { error: "Link not found" },
      { status: 404 }
    );
  }

  return NextResponse.json(stats);
}
