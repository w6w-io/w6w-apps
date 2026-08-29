import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, joinIds, WrikeClient } from "../lib/client.ts";

/** `GET /timelogs/{timelogIds}` — one or more timelog records by ID. */
interface Input {
  timelogIds: string | string[];
}

const timelogGet: ActionDefinition<Input> = {
  key: "timelog-get",
  type: "read",
  resource: "timelog",
  title: "Get Timelogs by ID",
  description: "Fetch one or more timelog records by ID.",
  params: [
    {
      key: "timelogIds",
      label: "Timelog ID(s)",
      type: "string",
      required: true,
      hint: "One timelog ID, or several comma-separated.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Timelogs" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(`/timelogs/${joinIds(input.timelogIds)}`);
    return { items };
  },
};

export default timelogGet;
