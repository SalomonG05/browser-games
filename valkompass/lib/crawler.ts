import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { prisma } from "./prisma";

export type CrawlResult =
  | { ok: true; sourceId: string; title: string; wordCount: number; isNew: boolean; changed: boolean }
  | { ok: false; error: string; url: string };

const USER_AGENT = "Valkompass-Bot/1.0 (educational research, non-commercial)";

// Sökvägar som indikerar politiskt innehåll — andra sidor ignoreras
const POLITICAL_PATTERNS = [
  "/var-politik",
  "/politik",
  "/politik-a-o",
  "/a-till-o",
  "/sakpolitik",
  "/fragor",
];

// Sökvägar och ändelser att alltid ignorera
const IGNORE_PATH_FRAGMENTS = [
  "press", "nyheter", "kalender", "kontakt",
  "donation", "medlem", "event", "media",
  "bilder", "filer", "sociala-medier",
];
const IGNORE_EXTENSIONS = [
  ".pdf", ".jpg", ".jpeg", ".png", ".gif",
  ".svg", ".zip", ".doc", ".docx", ".xlsx",
  ".mp3", ".mp4", ".webp",
];

/** Normaliserar en URL för jämförelse: lowercase domain, strip trailing slash, strip hash+query. */
export function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/+$/, "") || "/";
    return `${u.protocol}//${u.hostname.toLowerCase()}${path}`;
  } catch {
    return url.toLowerCase();
  }
}

/** Returnerar true om URL:ens sökväg matchar ett känt politiskt mönster. */
export function isPoliticallyRelevant(url: string): boolean {
  try {
    const { pathname } = new URL(url);
    return POLITICAL_PATTERNS.some((p) => pathname.toLowerCase().includes(p));
  } catch {
    return false;
  }
}

/**
 * Returnerar skäl att hoppa över URL:en, eller null om den är ok.
 * Kontrollerar filändelser och icke-politiska sökvägar.
 */
export function shouldIgnoreUrl(url: string): string | null {
  try {
    const { pathname } = new URL(url);
    const lower = pathname.toLowerCase();
    const ext = IGNORE_EXTENSIONS.find((e) => lower.endsWith(e));
    if (ext) return `filtyp ${ext}`;
    const blocked = IGNORE_PATH_FRAGMENTS.find((p) => lower.split("/").some((seg) => seg === p || seg.startsWith(p + "-")));
    if (blocked) return blocked;
    return null;
  } catch {
    return "ogiltig URL";
  }
}

async function checkRobotsTxt(baseUrl: string): Promise<boolean> {
  try {
    const url = new URL(baseUrl);
    const robotsUrl = `${url.protocol}//${url.host}/robots.txt`;
    const res = await fetch(robotsUrl, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return true;
    const text = await res.text();
    const lines = text.split("\n");
    let inOurBlock = false;
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.toLowerCase().startsWith("user-agent:")) {
        const agent = trimmed.slice("user-agent:".length).trim();
        inOurBlock = agent === "*" || agent.toLowerCase().includes("valkompass");
      }
      if (inOurBlock && trimmed.toLowerCase().startsWith("disallow:")) {
        const path = trimmed.slice("disallow:".length).trim();
        if (path === "") continue;         // Tom Disallow = tillåt allt
        if (path === "/") return false;    // Disallow: / = blockera allt
        if (url.pathname.startsWith(path)) return false;
      }
    }
    return true;
  } catch {
    return true;
  }
}

function extractText($: cheerio.CheerioAPI): string {
  $("script, style, nav, header, footer, [aria-hidden='true']").remove();
  const parts: string[] = [];
  $("h1, h2, h3, h4, p, li, blockquote, td, th").each((_, el) => {
    const text = $(el).text().trim();
    if (text.length > 20) parts.push(text);
  });
  return parts.join("\n").replace(/\s+\n/g, "\n").trim();
}

function hashContent(text: string): string {
  return crypto.createHash("sha256").update(text).digest("hex").slice(0, 32);
}

/**
 * Hittar interna politiskt relevanta länkar på en sida vars sökväg börjar med basePath.
 * Filtrerar bort icke-politiska sökvägar och ignorerade filändelser.
 */
export async function discoverLinks(pageUrl: string, basePath: string): Promise<string[]> {
  try {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": USER_AGENT, Accept: "text/html" },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return [];
    const html = await res.text();
    const $ = cheerio.load(html);
    const hostname = new URL(pageUrl).hostname.toLowerCase();
    const seen = new Set<string>();
    const links: string[] = [];

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") ?? "";
      let absolute: string;
      try {
        absolute = new URL(href, pageUrl).href;
      } catch {
        return;
      }
      const parsed = new URL(absolute);
      if (parsed.hostname.toLowerCase() !== hostname) return;
      if (!parsed.pathname.startsWith(basePath)) return;
      if (parsed.pathname === new URL(pageUrl).pathname) return;
      const clean = normalizeUrl(absolute);
      if (shouldIgnoreUrl(clean)) return;
      if (!seen.has(clean)) {
        seen.add(clean);
        links.push(clean);
      }
    });

    return links;
  } catch {
    return [];
  }
}

export async function crawlPage(
  url: string,
  partyId: string,
  sourceType = "PARTY_WEBSITE",
  isPrimary = true,
): Promise<CrawlResult> {
  if (url.toLowerCase().endsWith(".pdf")) {
    return { ok: false, error: "pdf_not_supported_yet", url };
  }

  const allowed = await checkRobotsTxt(url);
  if (!allowed) {
    return { ok: false, error: "blocked_by_robots_txt", url };
  }

  let html: string;
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "sv,en;q=0.9",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      return { ok: false, error: `http_${res.status}`, url };
    }
    html = await res.text();
  } catch (err) {
    return { ok: false, error: String(err), url };
  }

  const $ = cheerio.load(html);
  const title = $("title").text().trim() || $("h1").first().text().trim() || url;
  const rawText = extractText($);

  if (rawText.length < 200) {
    return { ok: false, error: "page_too_short", url };
  }

  const contentHash = hashContent(rawText);
  const wordCount = rawText.split(/\s+/).length;

  const existingByHash = await prisma.source.findFirst({ where: { url, contentHash } });
  if (existingByHash) {
    return { ok: true, sourceId: existingByHash.id, title, wordCount, isNew: false, changed: false };
  }

  const existingByUrl = await prisma.source.findFirst({ where: { url } });
  if (existingByUrl) {
    const updated = await prisma.source.update({
      where: { id: existingByUrl.id },
      data: { rawText, contentHash, title, fetchedAt: new Date(), changed: true },
    });
    return { ok: true, sourceId: updated.id, title, wordCount, isNew: false, changed: true };
  }

  const source = await prisma.source.create({
    data: { partyId, url, title, rawText, contentHash, sourceType, isPrimary },
  });
  return { ok: true, sourceId: source.id, title, wordCount, isNew: true, changed: false };
}
