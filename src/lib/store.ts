// In-memory store for development / Vercel serverless
// In production, replace with Vercel KV or Vercel Blob

export interface SharedLink {
  id: string;
  fileName: string;
  fileType: string;
  redactedContent: string; // base64 encoded
  createdAt: number;
  expiresAt: number;
  password?: string;
  maxViews?: number;
  views: ViewRecord[];
  redactedItems: string[];
}

export interface ViewRecord {
  timestamp: number;
  ip: string;
  userAgent: string;
}

// For Vercel serverless, we use a simple Map
// This resets on cold starts - for production use Vercel KV
const linkStore = new Map<string, SharedLink>();

export function saveLink(link: SharedLink): void {
  linkStore.set(link.id, link);
}

export function getLink(id: string): SharedLink | undefined {
  const link = linkStore.get(id);
  if (!link) return undefined;
  
  // Check expiry
  if (Date.now() > link.expiresAt) {
    linkStore.delete(id);
    return undefined;
  }
  
  return link;
}

export function recordView(id: string, view: ViewRecord): boolean {
  const link = linkStore.get(id);
  if (!link) return false;
  
  // Check max views
  if (link.maxViews && link.views.length >= link.maxViews) {
    return false;
  }
  
  link.views.push(view);
  return true;
}

export function getLinkStats(id: string): { views: ViewRecord[]; totalViews: number } | undefined {
  const link = linkStore.get(id);
  if (!link) return undefined;
  return { views: link.views, totalViews: link.views.length };
}

export function getAllLinks(): SharedLink[] {
  const now = Date.now();
  const links: SharedLink[] = [];
  for (const [id, link] of linkStore.entries()) {
    if (now > link.expiresAt) {
      linkStore.delete(id);
    } else {
      links.push(link);
    }
  }
  return links;
}
