import type { ActionDefinition } from "@w6w/types";
import { agentIdParam } from "../lib/params.ts";
import { PhantomBusterClient } from "../lib/client.ts";

/** `GET /containers/fetch-all` — every container an agent has created, newest first. */
interface Input {
  agentId: string;
  beforeEndedAt?: string;
  limit?: number;
  mode?: "all" | "finalized";
  withRuntimeEvents?: boolean;
}

const containerList: ActionDefinition<Input> = {
  key: "container-list",
  type: "read",
  title: "List Containers",
  description: "List the containers (runs) an agent has created.",
  params: [
    agentIdParam,
    {
      key: "beforeEndedAt",
      label: "Before ended at",
      type: "string",
      hint: "Only return containers that ended before this date.",
    },
    {
      key: "limit",
      label: "Limit",
      type: "number",
      validation: { integer: true, min: 1 },
      default: 20,
      hint: "PhantomBuster documents no default for this endpoint; a small default is prefilled " +
        "here rather than requesting an unbounded list.",
    },
    {
      key: "mode",
      label: "Mode",
      type: "select",
      options: [
        { value: "all", label: "All containers" },
        { value: "finalized", label: "Finalized containers only" },
      ],
    },
    {
      key: "withRuntimeEvents",
      label: "Include runtime events",
      type: "boolean",
    },
  ],
  output: [
    { key: "maxLimitReached", type: "boolean", label: "Limit reached" },
    { key: "containers", type: "array", label: "Containers" },
  ],

  async execute(input, ctx) {
    const client = new PhantomBusterClient(ctx);
    return await client.get("/containers/fetch-all", {
      query: {
        agentId: input.agentId,
        beforeEndedAt: input.beforeEndedAt,
        limit: input.limit,
        mode: input.mode,
        withRuntimeEvents: input.withRuntimeEvents ? "true" : undefined,
      },
    });
  },
};

export default containerList;
