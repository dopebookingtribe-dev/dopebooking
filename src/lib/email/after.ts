import "server-only";
import { after } from "next/server";
import { processEmailOutbox } from "./outbox";

/** Sends emails queued by the current action once the response is out. */
export function sendQueuedEmailsAfterResponse() {
  after(async () => {
    try {
      await processEmailOutbox();
    } catch (error) {
      console.error("Email outbox run failed", error);
    }
  });
}
