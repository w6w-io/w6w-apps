import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { robotIdParam } from "../lib/params.ts";

/** `GET /v2/robots/{robotId}/monitors` — a robot's monitors. No pagination is documented. */
interface Input {
  robotId: string;
}

interface Output {
  totalCount: number;
  items: unknown[];
}

const monitorList: ActionDefinition<Input, Output> = {
  key: "monitor-list",
  type: "search",
  resource: "monitor",
  title: "List Monitors",
  description: "List every monitor on a robot.",
  params: [robotIdParam],
  output: [
    { key: "totalCount", type: "number", label: "Total monitors" },
    { key: "items", type: "array", label: "Monitors" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ monitors: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/monitors`,
    );
    return body.monitors;
  },
};

export default monitorList;
