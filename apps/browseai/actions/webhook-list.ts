import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { robotIdParam } from "../lib/params.ts";

/** `GET /v2/robots/{robotId}/webhooks` — a robot's registered webhooks. */
interface Input {
  robotId: string;
}

interface Output {
  totalCount: number;
  items: Array<{ id: string; url: string; webhookEvent: string; createdAt: number }>;
}

const webhookList: ActionDefinition<Input, Output> = {
  key: "webhook-list",
  type: "search",
  resource: "webhook",
  title: "List Webhooks",
  description: "List every webhook registered on a robot.",
  params: [robotIdParam],
  output: [
    { key: "totalCount", type: "number", label: "Total webhooks" },
    { key: "items", type: "array", label: "Webhooks" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ webhooks: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/webhooks`,
    );
    return body.webhooks;
  },
};

export default webhookList;
