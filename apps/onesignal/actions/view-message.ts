import type { ActionDefinition } from "@w6w/types";
import { OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  messageId: string;
}

/** `GET /notifications/{message_id}?app_id={app_id}` — verified against the OpenAPI document. */
const viewMessage: ActionDefinition<Input> = {
  key: "view-message",
  type: "read",
  resource: "notification",
  title: "Get Message",
  description: "Retrieve delivery stats and content for one message.",
  params: [
    { key: "messageId", label: "Message ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Message ID" },
    { key: "successful", type: "number", label: "Successful deliveries" },
    { key: "failed", type: "number", label: "Failed deliveries" },
  ],

  execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    return new OneSignalClient(ctx).json(`/notifications/${encodeURIComponent(input.messageId)}`, {
      query: { app_id: appId },
    });
  },
};

export default viewMessage;
