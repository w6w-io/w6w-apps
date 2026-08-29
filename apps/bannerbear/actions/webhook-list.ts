import type { ActionDefinition } from "@w6w/types";
import { BannerbearClient } from "../lib/client.ts";
import { pageParam } from "../lib/params.ts";

interface Webhook {
  uid: string;
  name: string;
  url: string;
  resource?: string;
  event?: string;
  status?: string;
  created_at?: string;
}

interface Input {
  page?: number;
}

/** `GET /webhooks` — Webhooks registered in the workspace, one page at a time. */
const action: ActionDefinition<Input, Webhook[]> = {
  key: "webhook-list",
  type: "read",
  resource: "webhook",
  title: "List Webhooks",
  description: "List Webhooks registered in the workspace.",
  params: [pageParam],
  output: [{ key: "webhooks", type: "array", label: "Webhooks" }],

  async execute(input, ctx) {
    return await new BannerbearClient(ctx).json<Webhook[]>("/webhooks", {
      query: { page: input.page },
    });
  },
};

export default action;
