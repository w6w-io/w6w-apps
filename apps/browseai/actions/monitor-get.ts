import type { ActionDefinition } from "@w6w/types";
import { BrowseAiClient } from "../lib/client.ts";
import { monitorIdParam, robotIdParam } from "../lib/params.ts";

/** `GET /v2/robots/{robotId}/monitors/{monitorId}` — a single monitor. */
interface Input {
  robotId: string;
  monitorId: string;
}

interface Output {
  id: string;
  name: string;
  status?: string;
  pausedReason?: string | null;
  schedule?: string;
  createdAt: number;
}

const monitorGet: ActionDefinition<Input, Output> = {
  key: "monitor-get",
  type: "read",
  resource: "monitor",
  title: "Get Monitor",
  description: "Retrieve a single monitor by ID.",
  params: [robotIdParam, monitorIdParam],
  output: [
    { key: "id", type: "string", label: "Monitor ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "Status" },
    { key: "pausedReason", type: "string", label: "Paused reason" },
    { key: "schedule", type: "string", label: "Schedule (RRULE)" },
  ],

  async execute(input, ctx) {
    const body = await new BrowseAiClient(ctx).request<{ monitor: Output }>(
      `/robots/${encodeURIComponent(input.robotId)}/monitors/${
        encodeURIComponent(input.monitorId)
      }`,
    );
    return body.monitor;
  },
};

export default monitorGet;
