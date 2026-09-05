import type { ActionDefinition } from "@w6w/types";
import { GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { paginationParams, paginationQuery } from "../lib/params.ts";

interface Input {
  page?: number;
  per_page?: number;
}

const webhookList: ActionDefinition<Input> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List all webhooks registered on the connected account.",
  params: [...paginationParams()],
  output: [
    { key: "data", type: "array", label: "Webhooks" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    return await new GivebutterClient(ctx).page("/webhooks", {
      query: paginationQuery(input),
    }) as PageEnvelope<unknown>;
  },
};

export default webhookList;
