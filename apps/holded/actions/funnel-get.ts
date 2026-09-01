import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/** `GET /funnels/{funnelId}` — one funnel, with its full stage list and running totals. */
interface Input {
  funnelId: string;
}

const funnelGet: ActionDefinition<Input> = {
  key: "funnel-get",
  type: "read",
  resource: "funnel",
  title: "Get Funnel",
  description: "Fetch one funnel by id.",
  params: [
    {
      key: "funnelId",
      label: "Funnel ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Funnels result.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Funnel ID" },
    { key: "name", type: "string", label: "Funnel name" },
    { key: "stages", type: "array", label: "Pipeline stages" },
    { key: "won", type: "object", label: "Won totals — {num, value}" },
    { key: "leads", type: "object", label: "Open lead totals — {num, value}" },
    { key: "lost", type: "object", label: "Lost totals — {num, value}" },
    { key: "recentWon", type: "array", label: "Most recent won lead ids" },
    { key: "recentLeads", type: "array", label: "Most recent open lead ids" },
    { key: "recentLost", type: "array", label: "Most recent lost lead ids" },
    { key: "labels", type: "array", label: "Labels defined on this funnel" },
    { key: "customFields", type: "array", label: "Custom field definitions" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).get<Record<string, unknown>>(
      `/funnels/${encodeId(input.funnelId)}`,
    );
  },
};

export default funnelGet;
