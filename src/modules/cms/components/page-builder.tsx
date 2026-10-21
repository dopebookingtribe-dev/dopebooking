"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Button, buttonClasses } from "@/components/ui/button";
import {
  discardPageDraft,
  publishPage,
  resetPageDraft,
  savePageDraft,
  type SaveResult,
} from "../actions";
import type { LibraryImage } from "../admin-queries";
import {
  BUILTIN_INFO,
  SECTION_FIELDS,
  SECTION_INFO,
  SEO_FIELDS,
} from "../fields";
import { emptySectionContent } from "../pages";
import {
  newSectionId,
  SECTION_TYPES,
  type PageContent,
  type Section,
  type SectionType,
} from "../schema";
import { FieldEditor, type EditorContext } from "./field-editor";
import { MediaPicker, type PickRequest } from "./media-picker";

type Props = {
  pageKey: string;
  title: string;
  path: string;
  initial: PageContent;
  state: {
    isNew: boolean;
    hasUnpublished: boolean;
    recovered: boolean;
    publishedAt: string | null;
  };
  canPublish: boolean;
  library: LibraryImage[];
  artists: EditorContext["artists"];
  categories: EditorContext["categories"];
};

function summary(section: Section) {
  const content = section.content as Record<string, unknown>;
  if (section.type === "builtin") return BUILTIN_INFO[section.content.block];
  return String(content.heading ?? "") || "No heading";
}

/** Edit a page's sections, save a draft, preview it, then publish. */
export function PageBuilder(props: Props) {
  const router = useRouter();
  const [content, setContent] = useState<PageContent>(props.initial);
  const [dirty, setDirty] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [picker, setPicker] = useState<PickRequest | null>(null);
  const [adding, setAdding] = useState(false);
  const [pending, startTransition] = useTransition();
  const [unpublished, setUnpublished] = useState(props.state.hasUnpublished);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  // Map "sections.3.content.heading" style paths to per-section errors.
  const errors = useMemo(() => {
    const map: Record<string, string> = {};
    if (result && !result.ok) {
      for (const issue of result.issues) map[issue.path] = issue.message;
    }
    return map;
  }, [result]);

  const ctx = (errorBase: string): EditorContext => ({
    library: props.library,
    artists: props.artists,
    categories: props.categories,
    pickImages: setPicker,
    errors: Object.fromEntries(
      Object.entries(errors)
        .filter(([key]) => key.startsWith(errorBase))
        .map(([key, message]) => [key.slice(errorBase.length), message]),
    ),
  });

  const update = (next: PageContent) => {
    setContent(next);
    setDirty(true);
  };
  const setSections = (sections: Section[]) => update({ ...content, sections });
  const sections = content.sections;

  const move = (index: number, delta: number) => {
    const next = [...sections];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item);
    setSections(next);
  };

  const run = (action: () => Promise<SaveResult>, after?: () => void) =>
    startTransition(async () => {
      const outcome = await action();
      setResult(outcome);
      if (outcome.ok) {
        after?.();
        router.refresh();
      }
    });

  const json = () => JSON.stringify(content);
  const save = () =>
    run(
      () => savePageDraft(props.pageKey, json()),
      () => {
        setDirty(false);
        setUnpublished(true);
      },
    );
  const publish = () => {
    if (!window.confirm("Publish this page? Visitors will see it right away."))
      return;
    run(
      () => publishPage(props.pageKey, json()),
      () => {
        setDirty(false);
        setUnpublished(false);
      },
    );
  };
  const preview = () =>
    startTransition(async () => {
      const outcome = await savePageDraft(props.pageKey, json());
      setResult(outcome);
      if (outcome.ok) {
        setDirty(false);
        setUnpublished(true);
        window.open(`/preview/${props.pageKey}`, "_blank", "noopener");
      }
    });

  const status = dirty
    ? { text: "Unsaved changes", tone: "text-uv" }
    : unpublished
      ? { text: "Draft differs from the live page", tone: "text-uv" }
      : props.state.isNew
        ? { text: "Showing built-in content", tone: "text-muted" }
        : { text: "Live version is up to date", tone: "text-success" };

  const sectionErrors = (index: number) =>
    Object.entries(errors).filter(([key]) =>
      key.startsWith(`sections.${index}.`),
    );

  return (
    <div>
      <div className="sticky top-16 z-30 -mx-(--gutter) border-b border-line bg-bg/95 px-(--gutter) py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className={`text-sm ${status.tone}`} role="status">
            {pending ? "Working…" : status.text}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={save} disabled={pending}>
              Save draft
            </Button>
            <Button variant="secondary" onClick={preview} disabled={pending}>
              Preview
            </Button>
            {props.canPublish ? (
              <Button onClick={publish} disabled={pending}>
                Publish
              </Button>
            ) : null}
          </div>
        </div>
        {result ? (
          <p
            role={result.ok ? "status" : "alert"}
            className={`mt-2 text-sm ${result.ok ? "text-success" : "text-danger"}`}
          >
            {result.message}
            {!result.ok && result.issues.length
              ? " Open the highlighted sections to fix them."
              : ""}
          </p>
        ) : null}
      </div>

      {props.state.recovered ? (
        <p
          role="alert"
          className="mt-6 rounded-(--radius) border border-uv/60 p-4 text-sm text-uv"
        >
          The saved draft could not be read and was replaced by the built-in
          content. Saving will overwrite it.
        </p>
      ) : null}

      <ol className="mt-8 flex flex-col gap-3">
        {sections.map((section, index) => {
          const info = SECTION_INFO[section.type];
          const isOpen = open === section.id;
          const problems = sectionErrors(index);
          return (
            <li
              key={section.id}
              className={`rounded-(--radius) border bg-surface-1 ${problems.length ? "border-danger" : isOpen ? "border-line-strong" : "border-line"} ${section.visible ? "" : "opacity-60"}`}
            >
              <div className="flex flex-wrap items-center gap-3 px-4 py-3">
                <button
                  type="button"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : section.id)}
                  className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="font-label text-sm text-muted">
                    {index + 1}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs text-accent">
                      {info.label}
                    </span>
                    <span className="block truncate font-semibold">
                      {summary(section)}
                    </span>
                  </span>
                  {!section.visible ? (
                    <span className="rounded-full border border-line-strong px-2 text-xs text-muted">
                      Hidden
                    </span>
                  ) : null}
                  {problems.length ? (
                    <span className="rounded-full border border-danger px-2 text-xs text-danger">
                      {problems.length} to fix
                    </span>
                  ) : null}
                </button>
                <div className="flex flex-wrap gap-1">
                  <IconButton
                    label="Move up"
                    disabled={index === 0}
                    onClick={() => move(index, -1)}
                  >
                    ↑
                  </IconButton>
                  <IconButton
                    label="Move down"
                    disabled={index === sections.length - 1}
                    onClick={() => move(index, 1)}
                  >
                    ↓
                  </IconButton>
                  {section.type !== "builtin" ? (
                    <>
                      <IconButton
                        label={
                          section.visible ? "Hide section" : "Show section"
                        }
                        onClick={() =>
                          setSections(
                            sections.map((item) =>
                              item.id === section.id
                                ? { ...item, visible: !item.visible }
                                : item,
                            ),
                          )
                        }
                      >
                        {section.visible ? "Hide" : "Show"}
                      </IconButton>
                      <IconButton
                        label="Duplicate section"
                        onClick={() => {
                          const copy = {
                            ...structuredClone(section),
                            id: newSectionId(),
                          };
                          setSections([
                            ...sections.slice(0, index + 1),
                            copy,
                            ...sections.slice(index + 1),
                          ]);
                        }}
                      >
                        Copy
                      </IconButton>
                      <IconButton
                        label="Delete section"
                        onClick={() => {
                          if (
                            window.confirm(
                              `Delete the “${summary(section)}” section?`,
                            )
                          ) {
                            setSections(
                              sections.filter((item) => item.id !== section.id),
                            );
                          }
                        }}
                      >
                        Delete
                      </IconButton>
                    </>
                  ) : null}
                </div>
              </div>

              {isOpen ? (
                <div className="flex flex-col gap-6 border-t border-line px-4 py-6 sm:px-6">
                  {section.type === "builtin" ? (
                    <p className="text-sm text-muted">
                      {BUILTIN_INFO[section.content.block]}. This part of the
                      page works on its own; you can move it but not edit or
                      remove it.
                    </p>
                  ) : (
                    SECTION_FIELDS[section.type].map((spec) => (
                      <FieldEditor
                        key={spec.name}
                        spec={spec}
                        value={section.content as Record<string, unknown>}
                        onChange={(next) =>
                          setSections(
                            sections.map((item) =>
                              item.id === section.id
                                ? ({ ...item, content: next } as Section)
                                : item,
                            ),
                          )
                        }
                        ctx={ctx(`sections.${index}.content.`)}
                        errorPath=""
                      />
                    ))
                  )}
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      <div className="mt-6">
        {adding ? (
          <div className="rounded-(--radius) border border-line-strong p-4 sm:p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="font-display text-2xl">Add a section</h2>
              <Button variant="ghost" onClick={() => setAdding(false)}>
                Cancel
              </Button>
            </div>
            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {SECTION_TYPES.filter((type) => SECTION_INFO[type].addable).map(
                (type: SectionType) => (
                  <li key={type}>
                    <button
                      type="button"
                      onClick={() => {
                        const section = {
                          id: newSectionId(),
                          type,
                          visible: true,
                          content: emptySectionContent(type),
                        } as Section;
                        setSections([...sections, section]);
                        setOpen(section.id);
                        setAdding(false);
                      }}
                      className="block h-full w-full rounded-(--radius) border border-line p-4 text-left transition-colors hover:border-accent hover:bg-surface-1"
                    >
                      <span className="block font-semibold">
                        {SECTION_INFO[type].label}
                      </span>
                      <span className="mt-1 block text-sm text-muted">
                        {SECTION_INFO[type].description}
                      </span>
                    </button>
                  </li>
                ),
              )}
            </ul>
          </div>
        ) : (
          <Button variant="secondary" onClick={() => setAdding(true)}>
            Add a section
          </Button>
        )}
      </div>

      <section
        aria-labelledby="seo-heading"
        className="mt-14 border-t border-line pt-10"
      >
        <h2 id="seo-heading" className="font-display text-2xl">
          Search and sharing
        </h2>
        <div className="mt-6 flex max-w-2xl flex-col gap-6">
          {SEO_FIELDS.map((spec) => (
            <FieldEditor
              key={spec.name}
              spec={spec}
              value={content.seo as Record<string, unknown>}
              onChange={(next) =>
                update({ ...content, seo: next as PageContent["seo"] })
              }
              ctx={ctx("seo.")}
              errorPath=""
            />
          ))}
        </div>
      </section>

      <section
        aria-labelledby="danger-heading"
        className="mt-14 border-t border-line pt-10"
      >
        <h2 id="danger-heading" className="font-display text-2xl">
          Undo changes
        </h2>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Throw away the draft and go back to the live version?",
                )
              )
                return;
              run(
                () => discardPageDraft(props.pageKey),
                () => {
                  setDirty(false);
                  setUnpublished(false);
                  window.location.reload();
                },
              );
            }}
          >
            Discard draft
          </Button>
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => {
              if (
                !window.confirm(
                  "Replace the draft with the built-in starting content? The live page stays as it is until you publish.",
                )
              )
                return;
              run(
                () => resetPageDraft(props.pageKey),
                () => window.location.reload(),
              );
            }}
          >
            Load starting content
          </Button>
          <a
            href={props.path}
            target="_blank"
            rel="noopener"
            className={buttonClasses("ghost")}
          >
            Open live page
          </a>
        </div>
      </section>

      <MediaPicker
        request={picker}
        library={props.library}
        onClose={() => setPicker(null)}
      />
    </div>
  );
}

function IconButton({
  label,
  children,
  ...props
}: React.ComponentProps<"button"> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-line px-3 text-xs text-muted hover:border-text hover:text-text disabled:opacity-30"
      {...props}
    >
      {children}
    </button>
  );
}
