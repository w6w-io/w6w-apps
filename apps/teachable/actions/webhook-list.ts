import type { ActionDefinition } from "@w6w/types";
import { TeachableClient } from "../lib/client.ts";

/**
 * `GET /v1/webhooks` — webhooks configured for the school.
 *
 * Read-only: the Public API has no `POST`/`PATCH`/`DELETE` for webhooks — they
 * are created and edited in the school admin UI, not through this API.
 */
const webhookList: ActionDefinition<Record<string, never>> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "Fetch all webhooks configured for your school. Webhooks are created and " +
    "edited in the Teachable admin UI, not via this API.",
  params: [],
  output: [
    { key: "webhooks", type: "array", label: "Webhooks" },
  ],

  execute(_input, ctx) {
    return new TeachableClient(ctx).json("/webhooks");
  },
};

export default webhookList;
