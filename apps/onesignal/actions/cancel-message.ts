import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/**
 * `DELETE /notifications/{message_id}?app_id={app_id}` — stops a scheduled or
 * currently-outgoing message. Verified against the OpenAPI document.
 *
 * Cancel counts toward the **same** per-app rate limit as Create Message
 * (documented in `/reference/rate-limits`), so a workflow that creates and
 * then immediately cancels many messages can throttle its own sends.
 */
const cancelMessage: ActionDefinition<Input> = {
  key: "cancel-message",
  type: "perform",
  resource: "notification",
  title: "Cancel Message",
  description: "Stop a scheduled or currently-outgoing message.",
  idempotent: true,
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Cancelled" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json(
      `/notifications/${encodeURIComponent(input.messageId)}`,
      { method: "DELETE", query: { app_id: appId } },
    );
  },
};

export default cancelMessage;
