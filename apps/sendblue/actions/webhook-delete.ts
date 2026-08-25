import type { ActionDefinition } from "@w6w/types";
import { compact, SendblueClient } from "../lib/client.ts";
import { toList } from "../lib/params.ts";

interface Input {
  urls: string[] | string;
  type?: string;
}

/** `DELETE /api/account/webhooks` — remove specific webhook URLs from one event type. */
const webhookDelete: ActionDefinition<Input> = {
  key: "webhook-delete",
  type: "perform",
  resource: "webhook",
  title: "Delete Webhooks",
  description: "Remove specific webhook URLs from the account.",
  idempotent: true,
  params: [
    { key: "urls", label: "Webhook URLs to remove", type: "multiselect", required: true },
    {
      key: "type",
      label: "Event type",
      type: "select",
      options: [
        "receive",
        "line_blocked",
        "line_assigned",
        "outbound",
        "typing_indicator",
        "call_log",
        "contact_created",
      ].map((v) => ({ value: v, label: v })),
    },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.delete(
      "/api/account/webhooks",
      compact({
        webhooks: toList(input.urls),
        type: input.type,
      }),
    );
  },
};

export default webhookDelete;
