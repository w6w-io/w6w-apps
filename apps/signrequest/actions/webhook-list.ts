import type { ActionDefinition } from "@w6w/types";
import { compact, SignRequestClient } from "../lib/client.ts";
import { limitParam, pageParam } from "../lib/params.ts";

interface Input {
  page?: number;
  limit?: number;
}

/** `GET /webhooks/` — list webhook subscriptions. */
const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List webhook subscriptions.",
  params: [pageParam, limitParam],
  output: [
    { key: "count", type: "number", label: "Total result count" },
    { key: "next", type: "string", label: "Next page URL" },
    { key: "previous", type: "string", label: "Previous page URL" },
    { key: "results", type: "array", label: "Webhooks" },
  ],

  execute(input, ctx) {
    return new SignRequestClient(ctx).request("/webhooks/", {
      query: compact({ page: input.page, limit: input.limit }),
    });
  },
};

export default webhookList;
