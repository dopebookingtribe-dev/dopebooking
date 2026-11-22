import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { VideoPlayer } from "@/modules/videos/components/video-player";
import type { Block, Inline } from "../body";
import type { EmbedFile } from "../queries";

function renderInline(items: Inline[], keyPrefix = "i"): ReactNode[] {
  return items.map((item, index) => {
    const key = `${keyPrefix}-${index}`;
    switch (item.type) {
      case "text":
        return item.text;
      case "strong":
        return (
          <strong key={key} className="font-semibold text-text">
            {renderInline(item.children, key)}
          </strong>
        );
      case "em":
        return <em key={key}>{renderInline(item.children, key)}</em>;
      case "code":
        return (
          <code
            key={key}
            className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[0.9em] text-text"
          >
            {item.text}
          </code>
        );
      case "link":
        return item.href.startsWith("/") || item.href.startsWith("#") ? (
          <Link key={key} href={item.href}>
            {renderInline(item.children, key)}
          </Link>
        ) : (
          <a
            key={key}
            href={item.href}
            rel="noopener noreferrer"
            target={item.href.startsWith("mailto:") ? undefined : "_blank"}
          >
            {renderInline(item.children, key)}
          </a>
        );
    }
  });
}

function Embed({ file, kind }: { file: EmbedFile | undefined; kind: string }) {
  // Deleted or replaced-away files simply disappear from the article.
  if (!file) return null;
  if (kind === "photo" && file.kind === "image") {
    return (
      <figure className="my-4">
        <Image
          src={file.url}
          alt={file.title}
          width={file.width ?? 1600}
          height={file.height ?? 1000}
          sizes="(min-width: 768px) 46rem, 92vw"
          className="w-full rounded-(--radius) bg-surface-2"
          style={{ objectPosition: file.position }}
        />
        {file.credit ? (
          <figcaption className="mt-2 font-label text-xs text-muted">
            Photo: {file.credit}
          </figcaption>
        ) : null}
      </figure>
    );
  }
  if (kind === "video" && file.kind === "video") {
    return (
      <figure className="my-4">
        <video
          controls
          preload="metadata"
          playsInline
          className="w-full rounded-(--radius) bg-black"
          aria-label={file.title}
        >
          <source src={file.url} type={file.mimeType ?? undefined} />
        </video>
        <figcaption className="mt-2 text-sm text-muted">
          {file.title}
        </figcaption>
      </figure>
    );
  }
  if (kind === "audio" && file.kind === "audio") {
    return (
      <figure className="my-4 rounded-(--radius) border border-line bg-surface-1 p-4">
        <figcaption className="mb-3 font-medium text-text">
          {file.title}
        </figcaption>
        <audio controls preload="none" src={file.url} className="w-full" />
      </figure>
    );
  }
  if (kind === "file" && file.kind === "document") {
    return (
      <p className="my-4">
        <a
          href={file.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-3 rounded-(--radius) border border-line-strong px-4 py-3 no-underline! transition-colors hover:border-accent"
        >
          <span aria-hidden className="font-display text-accent">
            PDF
          </span>
          <span className="text-text">{file.title}</span>
        </a>
      </p>
    );
  }
  return null;
}

/** A news article body: text blocks plus embedded library media. */
export function PostBody({
  blocks,
  embeds,
  size = "lg",
}: {
  blocks: Block[];
  embeds: Record<string, EmbedFile>;
  /** "base" for legal texts, which use the body size. */
  size?: "lg" | "base";
}) {
  return (
    <div
      className={`flex max-w-prose flex-col gap-5 leading-relaxed text-muted [&_a]:text-text [&_a]:underline [&_a]:underline-offset-4 [&_a:hover]:text-accent ${size === "lg" ? "text-lg" : ""}`}
    >
      {blocks.map((block, index) => {
        const key = `b-${index}`;
        switch (block.type) {
          case "paragraph":
            return (
              <p key={key} className="whitespace-pre-line">
                {renderInline(block.content, key)}
              </p>
            );
          case "heading":
            return block.level === 2 ? (
              <h2 key={key} className="mt-6 font-display text-3xl text-text">
                {renderInline(block.content, key)}
              </h2>
            ) : (
              <h3 key={key} className="mt-4 text-xl font-semibold text-text">
                {renderInline(block.content, key)}
              </h3>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag
                key={key}
                className={`flex flex-col gap-2 pl-6 ${block.ordered ? "list-decimal" : "list-disc"}`}
              >
                {block.items.map((item, i) => (
                  <li key={i}>{renderInline(item, `${key}-${i}`)}</li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <blockquote
                key={key}
                className="border-l-2 border-accent pl-5 font-display text-2xl text-text"
              >
                {renderInline(block.content, key)}
              </blockquote>
            );
          case "embed":
            return (
              <Embed key={key} file={embeds[block.id]} kind={block.kind} />
            );
          case "video-link":
            return (
              <div key={key} className="my-4">
                <VideoPlayer
                  source={block.source}
                  title="Video"
                  poster={null}
                />
              </div>
            );
        }
      })}
    </div>
  );
}
