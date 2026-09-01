import type { ActionDefinition } from "@w6w/types";
import { DripClient } from "../lib/client.ts";

interface Input {
  page?: number;
  perPage?: number;
}

const listEventActions: ActionDefinition<Input> = {
  key: "list-event-actions",
  type: "read",
  resource: "event",
  title: "List Custom Event Actions",
  description: "List every distinct custom event action name recorded in this account.",
  params: [
    { key: "page", label: "Page", type: "number", advanced: true, default: 1 },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      advanced: true,
      default: 100,
      hint: "Maximum 1000.",
    },
  ],
  output: [{ key: "eventActions", type: "array", label: "Event actions" }],

  async execute(input, ctx) {
    const body = await new DripClient(ctx).request<{ event_actions?: string[] }>(
      "/event_actions",
      { query: { page: input.page, per_page: input.perPage } },
    );
    return { eventActions: body.event_actions ?? [] };
  },
};

export default listEventActions;
