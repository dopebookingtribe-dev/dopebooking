"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { createClient } from "@/lib/supabase/client";
import { IMAGE_TYPES, MAX_IMAGE_BYTES } from "../constants";
import { checkImage, worstLevel, type Finding } from "../image-check";
import {
  FORMAT_LABEL,
  IMAGE_SPECS,
  MAX_SIZE_LABEL,
  ratioLabel,
  sizeLabel,
  type ImageSpecId,
} from "../image-specs";
import type { ImageResult, RegisterImageInput } from "../server";
import { Findings, ImageGuide } from "./image-guide";

const EXTENSIONS: Record<(typeof IMAGE_TYPES)[number], string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

type Message = { error: boolean; text: string };

/** What an upload is for: drives the size guide, the checks and the role. */
export type UploadRole = {
  spec: ImageSpecId;
  /** Short name in the role picker, e.g. "Portrait". */
  label?: string;
  /** Called with the new photo's id, e.g. to make it the cover. */
  assign?: (assetId: string) => Promise<void>;
};

type Checked = {
  file: File;
  width: number;
  height: number;
  /** Hard problem: wrong type, too big or unreadable. */
  error: string | null;
  findings: Finding[];
};

function hardError(file: File): string | null {
  if (!(IMAGE_TYPES as readonly string[]).includes(file.type)) {
    return `${file.name}: use a ${FORMAT_LABEL} image.`;
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return `${file.name}: the photo must be under ${MAX_SIZE_LABEL}.`;
  }
  return null;
}

async function measure(file: File) {
  // "from-image" applies the camera's rotation, so portrait phone photos
  // are measured (and later laid out) the way they are displayed.
  const bitmap = await createImageBitmap(file, {
    imageOrientation: "from-image",
  });
  const { width, height } = bitmap;
  bitmap.close();
  return { width, height };
}

/**
 * Uploads straight from the browser to Supabase Storage (avoids server body
 * limits), then asks the server to verify and record each file.
 * With `multiple`, every file gets the same description unless one is typed.
 * With `roles`, it shows the size guide for the chosen placement and checks
 * each photo against it before uploading.
 */
export function ImageUploader({
  folder,
  register,
  multiple = false,
  defaultAlt,
  roles = [],
  guidelinesHref,
  onUploaded,
}: {
  folder: string;
  register: (input: RegisterImageInput) => Promise<ImageResult>;
  multiple?: boolean;
  defaultAlt?: string;
  roles?: UploadRole[];
  guidelinesHref?: string;
  onUploaded?: (ids: string[]) => void;
}) {
  const router = useRouter();
  const fileId = useId();
  const roleName = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [roleIndex, setRoleIndex] = useState(0);
  const [checked, setChecked] = useState<Checked[]>([]);
  const [preview, setPreview] = useState<string | null>(null);
  const [message, setMessage] = useState<Message>();
  const [busy, setBusy] = useState(false);

  const role = roles[roleIndex] as UploadRole | undefined;
  const spec = role ? IMAGE_SPECS[role.spec] : null;
  // A role that fills one slot (portrait, cover, logo) takes one photo.
  const allowMany = multiple && !role?.assign;

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  // Re-check the chosen files when the placement changes.
  const recheck = (list: Checked[], specId = role?.spec) =>
    list.map((item) =>
      item.error || !specId
        ? item
        : {
            ...item,
            findings: checkImage(IMAGE_SPECS[specId], {
              width: item.width,
              height: item.height,
              bytes: item.file.size,
              type: item.file.type,
            }),
          },
    );

  async function onFiles(files: File[]) {
    setMessage(undefined);
    setPreview(files[0] ? URL.createObjectURL(files[0]) : null);
    const results = await Promise.all(
      files.map(async (file): Promise<Checked> => {
        const error = hardError(file);
        if (error) return { file, width: 0, height: 0, error, findings: [] };
        try {
          const { width, height } = await measure(file);
          return { file, width, height, error: null, findings: [] };
        } catch {
          return {
            file,
            width: 0,
            height: 0,
            error: `${file.name}: this browser can't read the image. Try a JPG or PNG.`,
            findings: [],
          };
        }
      }),
    );
    setChecked(recheck(results));
  }

  async function uploadOne(item: Checked, altText: string, credit: string) {
    const { file, width, height } = item;
    const ext = EXTENSIONS[file.type as keyof typeof EXTENSIONS];
    const path = `${folder}/${crypto.randomUUID()}.${ext}`;
    const supabase = createClient();
    const { error } = await supabase.storage
      .from("public-media")
      .upload(path, file, {
        contentType: file.type,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw new Error(`${file.name}: upload failed.`);

    const result = await register({
      path,
      alt_text: altText,
      credit,
      width,
      height,
    });
    if (!result.ok) {
      await supabase.storage.from("public-media").remove([path]);
      throw new Error(`${file.name}: ${result.message}`);
    }
    return result.id;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const altText = String(data.get("alt_text") ?? "").trim() || defaultAlt;
    const credit = String(data.get("credit") ?? "").trim();

    if (!checked.length) {
      return setMessage({ error: true, text: "Choose a photo first." });
    }
    const invalid = checked.find((item) => item.error);
    if (invalid) return setMessage({ error: true, text: invalid.error! });
    if (!altText) {
      return setMessage({
        error: true,
        text: "Describe the photo for screen readers.",
      });
    }

    setBusy(true);
    const failures: string[] = [];
    const ids: string[] = [];
    for (const [index, item] of checked.entries()) {
      setMessage({
        error: false,
        text:
          checked.length > 1
            ? `Uploading ${index + 1} of ${checked.length}…`
            : "Uploading…",
      });
      try {
        const id = await uploadOne(item, altText, credit);
        if (id) ids.push(id);
      } catch (error) {
        failures.push(error instanceof Error ? error.message : item.file.name);
      }
    }
    if (role?.assign && ids[0]) await role.assign(ids[0]);
    setBusy(false);

    if (failures.length < checked.length) {
      form.reset();
      setChecked([]);
      setPreview(null);
      router.refresh();
      onUploaded?.(ids);
    }
    const noun = role?.label ? role.label.toLowerCase() : "photo";
    setMessage(
      failures.length
        ? { error: true, text: failures.join(" ") }
        : {
            error: false,
            text:
              checked.length > 1
                ? `${checked.length} photos added.`
                : role?.assign
                  ? `Uploaded and set as the ${noun}.`
                  : "Photo added.",
          },
    );
  }

  const usable = checked.filter((item) => !item.error);
  const warned = usable.filter(
    (item) => worstLevel(item.findings) === "warn",
  ).length;
  const single = checked.length === 1 ? checked[0] : null;

  return (
    <form
      onSubmit={onSubmit}
      className="flex flex-col gap-5 rounded-(--radius) border border-line p-5"
      noValidate
    >
      {roles.length > 1 ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium">
            What is this photo for?
          </legend>
          <div className="flex flex-wrap gap-2">
            {roles.map((option, index) => {
              const optionSpec = IMAGE_SPECS[option.spec];
              const active = index === roleIndex;
              return (
                <label
                  key={option.spec}
                  className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-sm transition-colors has-focus-visible:outline-2 has-focus-visible:outline-accent ${active ? "border-accent bg-accent/10 text-text" : "border-line-strong text-muted hover:text-text"}`}
                >
                  <input
                    type="radio"
                    name={roleName}
                    className="sr-only"
                    checked={active}
                    onChange={() => {
                      setRoleIndex(index);
                      // One-slot roles take a single photo: start over.
                      if (option.assign && checked.length > 1) {
                        setChecked([]);
                        setPreview(null);
                        if (inputRef.current) inputRef.current.value = "";
                      } else {
                        setChecked((list) => recheck(list, option.spec));
                      }
                    }}
                  />
                  <span>{option.label ?? optionSpec.title}</span>
                  <span className="font-label text-xs text-muted">
                    {optionSpec.anyRatio
                      ? `${Math.max(...optionSpec.size)} px`
                      : `${optionSpec.size[0]} × ${optionSpec.size[1]} · ${ratioLabel(...optionSpec.size)}`}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      {spec ? (
        <ImageGuide
          spec={spec}
          preview={
            preview
              ? {
                  url: preview,
                  width: checked[0]?.width || undefined,
                  height: checked[0]?.height || undefined,
                }
              : undefined
          }
          guidelinesHref={
            guidelinesHref
              ? `${guidelinesHref}#${spec.fallbackFor ?? spec.id}`
              : undefined
          }
          findings={single && !single.error ? single.findings : undefined}
        />
      ) : null}

      <div
        className={
          spec ? "flex flex-col gap-4" : "grid gap-6 sm:grid-cols-[10rem_1fr]"
        }
      >
        {spec ? null : (
          <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-(--radius) bg-surface-2 text-center text-xs text-muted">
            {preview ? (
              // Local blob preview; next/image can't optimise blob: URLs.
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="size-full object-cover" />
            ) : (
              "No photo chosen"
            )}
          </div>
        )}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label htmlFor={fileId} className="text-sm font-medium">
              {allowMany ? "Photos" : "Photo"}
            </label>
            <input
              ref={inputRef}
              id={fileId}
              name="file"
              type="file"
              multiple={allowMany}
              accept={IMAGE_TYPES.join(",")}
              aria-describedby={`${fileId}-hint`}
              onChange={(event) =>
                onFiles(
                  [...(event.target.files ?? [])].filter((file) => file.size),
                )
              }
              className="text-sm file:mr-4 file:min-h-11 file:cursor-pointer file:rounded-(--radius) file:border file:border-line-strong file:bg-surface-1 file:px-4 file:text-text"
            />
            <p id={`${fileId}-hint`} className="text-sm text-muted">
              {spec ? `${sizeLabel(spec.size)} recommended. ` : ""}
              {FORMAT_LABEL}, up to {MAX_SIZE_LABEL}
              {allowMany ? " each. You can select many at once." : "."}
            </p>
          </div>

          {checked.length > 1 ? (
            <div aria-live="polite" className="flex flex-col gap-2">
              <p className="text-sm">
                {[
                  `${checked.length} photos checked`,
                  spec ? `${usable.length - warned} fit` : null,
                  spec && warned
                    ? `${warned} ${warned === 1 ? "needs" : "need"} a look`
                    : null,
                  checked.length > usable.length
                    ? `${checked.length - usable.length} can't be uploaded`
                    : null,
                ]
                  .filter(Boolean)
                  .join(", ")}
                .
              </p>
              <ul className="flex max-h-56 flex-col gap-3 overflow-y-auto rounded-(--radius) border border-line p-3">
                {checked.map((item) => (
                  <li key={`${item.file.name}-${item.file.size}`}>
                    <p className="truncate font-label text-xs text-muted">
                      {item.file.name}
                      {item.error ? "" : ` · ${item.width} × ${item.height}`}
                    </p>
                    {item.error ? (
                      <p className="text-sm text-danger">{item.error}</p>
                    ) : (
                      <Findings
                        findings={item.findings.filter(
                          (finding) => finding.level === "warn",
                        )}
                      />
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : single?.error ? (
            <p role="alert" className="text-sm text-danger">
              {single.error}
            </p>
          ) : null}

          <Field
            name="alt_text"
            label={
              defaultAlt ? "Description (optional)" : "Description (alt text)"
            }
            hint={
              defaultAlt
                ? `Leave empty to use “${defaultAlt}”.`
                : "What's in the photo, e.g. “Artist DJing at sunrise, arms raised”."
            }
            maxLength={300}
          />
          <Field
            name="credit"
            label="Photo credit (optional)"
            maxLength={120}
          />
          <div className="flex flex-wrap items-center gap-4">
            <Button type="submit" disabled={busy}>
              {busy
                ? "Uploading…"
                : warned
                  ? "Upload anyway"
                  : allowMany
                    ? "Upload photos"
                    : "Upload photo"}
            </Button>
            {warned && !busy ? (
              <p className="text-sm text-muted">
                {warned === 1 && checked.length === 1
                  ? "This photo may not display well. See the notes above."
                  : `${warned} of ${checked.length} photos may not display well.`}
              </p>
            ) : null}
            {message ? (
              <p
                role={message.error ? "alert" : "status"}
                className={`text-sm ${message.error ? "text-danger" : "text-muted"}`}
              >
                {message.text}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </form>
  );
}
