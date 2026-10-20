/** A status change or a message in a request's conversation. */
export type TimelineItem<Status extends string = string> =
  | {
      kind: "status";
      id: string;
      at: string;
      from: Status | null;
      to: Status;
      note: string | null;
      by: string | null;
    }
  | {
      kind: "message";
      id: string;
      at: string;
      body: string;
      internal: boolean;
      by: string | null;
    };

export type Tone = "neutral" | "uv" | "accent" | "success" | "danger" | "muted";

export type WorkflowConfig<Status extends string> = {
  labels: Record<Status, string>;
  tones: Record<Status, Tone>;
  /** Button text for moving *to* a status. */
  actions: Partial<Record<Status, string>>;
};
