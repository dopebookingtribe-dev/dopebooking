import { parseVideoUrl, type VideoSource } from "@/lib/video";

/*
 * News post bodies are plain text with light markup, parsed here into
 * blocks that React renders. Nothing is ever rendered as HTML.
 *
 *   ## Heading            ### Smaller heading
 *   - item / * item        1. numbered item
 *   > quote
 *   **bold**  *italic*  `code`  [link text](https://… or /path or mailto:…)
 *   [[photo:<id>]]  [[video:<id>]]  [[audio:<id>]]  [[file:<id>]]
 *   A line with only a YouTube/Vimeo/Mux/Cloudflare link embeds the player.
 * Blank lines separate paragraphs; a single line break stays a line break
 * (like the page builder's text fields).
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "strong"; children: Inline[] }
  | { type: "em"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: Inline[] };

export const EMBED_KINDS = ["photo", "video", "audio", "file"] as const;
export type EmbedKind = (typeof EMBED_KINDS)[number];

export type Block =
  | { type: "paragraph"; content: Inline[] }
  | { type: "heading"; level: 2 | 3; content: Inline[] }
  | { type: "list"; ordered: boolean; items: Inline[][] }
  | { type: "quote"; content: Inline[] }
  | { type: "embed"; kind: EmbedKind; id: string }
  | { type: "video-link"; source: VideoSource };

const EMBED_RE = /^\[\[(photo|video|audio|file):([0-9a-f-]{36})\]\]$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only site paths, anchors, https and mailto links are kept. */
export function safeHref(href: string): string | null {
  const value = href.trim();
  if (/^\/(?!\/)[^\s"'<>]*$/.test(value)) return value;
  if (/^#[\w-]+$/.test(value)) return value;
  if (/^mailto:[^\s"'<>]+$/i.test(value)) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

/** Inline markup: links, then bold, then italics. Unknown markup stays text. */
export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let rest = text;
  const pushText = (value: string) => {
    if (!value) return;
    const last = out[out.length - 1];
    if (last?.type === "text") last.text += value;
    else out.push({ type: "text", text: value });
  };
  while (rest) {
    const code = /`([^`]+)`/.exec(rest);
    const link = /\[([^\]]+)\]\(([^)\s]+)\)/.exec(rest);
    const strong = /\*\*([^*]+)\*\*/.exec(rest);
    const em = /(?<![*\w])[*_]([^*_]+)[*_](?![*\w])/.exec(rest);
    const candidates = [code, link, strong, em].filter(
      (m): m is RegExpExecArray => m !== null,
    );
    if (!candidates.length) {
      pushText(rest);
      break;
    }
    const next = candidates.sort((a, b) => a.index - b.index)[0];
    pushText(rest.slice(0, next.index));
    if (next === code) {
      out.push({ type: "code", text: next[1] });
    } else if (next === link) {
      const href = safeHref(next[2]);
      if (href)
        out.push({ type: "link", href, children: parseInline(next[1]) });
      else pushText(next[1]);
    } else if (next === strong) {
      out.push({ type: "strong", children: parseInline(next[1]) });
    } else {
      out.push({ type: "em", children: parseInline(next[1]) });
    }
    rest = rest.slice(next.index + next[0].length);
  }
  return out;
}

export function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: string[] } | null = null;
  let quote: string[] = [];

  const flush = () => {
    if (paragraph.length) {
      blocks.push({
        type: "paragraph",
        content: parseInline(paragraph.join("\n")),
      });
      paragraph = [];
    }
    if (list) {
      blocks.push({
        type: "list",
        ordered: list.ordered,
        items: list.items.map((item) => parseInline(item)),
      });
      list = null;
    }
    if (quote.length) {
      blocks.push({ type: "quote", content: parseInline(quote.join(" ")) });
      quote = [];
    }
  };

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const embed = EMBED_RE.exec(line);
    if (embed && UUID_RE.test(embed[2])) {
      flush();
      blocks.push({
        type: "embed",
        kind: embed[1].toLowerCase() as EmbedKind,
        id: embed[2].toLowerCase(),
      });
      continue;
    }
    if (/^https:\/\/\S+$/.test(line)) {
      const source = parseVideoUrl(line);
      if (source) {
        flush();
        blocks.push({ type: "video-link", source });
        continue;
      }
    }
    const heading = /^(#{2,3})\s+(.+)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({
        type: "heading",
        level: heading[1].length as 2 | 3,
        content: parseInline(heading[2]),
      });
      continue;
    }
    const bullet = /^[-*]\s+(.+)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.+)$/.exec(line);
    if (bullet || numbered) {
      const ordered = Boolean(numbered);
      if (
        paragraph.length ||
        quote.length ||
        (list && list.ordered !== ordered)
      )
        flush();
      list ??= { ordered, items: [] };
      list.items.push((bullet ?? numbered)![1]);
      continue;
    }
    const quoted = /^>\s?(.*)$/.exec(line);
    if (quoted) {
      if (paragraph.length || list) flush();
      quote.push(quoted[1]);
      continue;
    }
    if (list || quote.length) flush();
    paragraph.push(line);
  }
  flush();
  return blocks;
}

/** Library ids a body embeds, so they load in one query. */
export function embeddedIds(blocks: Block[]) {
  return blocks.flatMap((block) => (block.type === "embed" ? [block.id] : []));
}

/** Plain text, e.g. for a generated excerpt or reading time. */
export function plainText(blocks: Block[]): string {
  const inline = (items: Inline[]): string =>
    items
      .map((item) =>
        item.type === "text" || item.type === "code"
          ? item.text
          : inline(item.children),
      )
      .join("");
  return blocks
    .map((block) => {
      switch (block.type) {
        case "paragraph":
        case "heading":
        case "quote":
          return inline(block.content);
        case "list":
          return block.items.map(inline).join(" ");
        default:
          return "";
      }
    })
    .filter(Boolean)
    .join(" ");
}

export function readingMinutes(blocks: Block[]) {
  const words = plainText(blocks).split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}
