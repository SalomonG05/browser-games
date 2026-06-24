import * as cheerio from "cheerio";
import * as crypto from "crypto";
import { prisma } from "./prisma";

export type CrawlResult =
  | { ok: true; sourceId: string; title: string; wordCount: number; isNew: boolean; changed: boolean }
  | { ok: false; error: string; url: string };

const USER_AGENT = "Valkompass-Bot/1.0 (educational research, non-commercial)";

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
        if (path === "") continue;  // Empty = allow all
        if (path === "/") return false;  // Block everything
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

export async function crawlPage(url: string, partyId: string, sourceType = "PARTY_WEBSITE", isPrimary = true): Promise<CrawlResult> {
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

  const existingByHash = await prisma.source.findFirst({
    where: { url, contentHash },
  });
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
