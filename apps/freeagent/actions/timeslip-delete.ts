import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  timeslipId: string;
}

const timeslipDelete: ActionDefinition<Input> = {
  key: "timeslip-delete",
  type: "perform",
  resource: "timeslip",
  title: "Delete Timeslip",
  description: "Delete a timeslip.",
  // A repeated DELETE against an id that's already gone answers 404, not a
  // second deletion — the end state is identical either way.
  idempotent: true,
  params: [
    { key: "timeslipId", label: "Timeslip ID", type: "string", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new FreeAgentClient(ctx).request(`/timeslips/${input.timeslipId}`, {
      method: "DELETE",
    });
    return {};
  },
};

export default timeslipDelete;
