import type { ActionDefinition } from "@w6w/types";
import { InstantlyClient } from "../lib/client.ts";

/** `POST /api/v2/emails/threads/{thread_id}/mark-as-read` — mark every email in a thread read. */
interface Input {
  thread_id: string;
}

const emailThreadMarkRead: ActionDefinition<Input> = {
  key: "email-thread-mark-read",
  type: "perform",
  resource: "email",
  title: "Mark Thread as Read",
  description: "Mark every email in a thread as read.",
  idempotent: true,
  params: [
    { key: "thread_id", label: "Thread ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  execute(input, ctx) {
    return new InstantlyClient(ctx).json(
      `/emails/threads/${encodeURIComponent(input.thread_id)}/mark-as-read`,
      { method: "POST" },
    );
  },
};

export default emailThreadMarkRead;
