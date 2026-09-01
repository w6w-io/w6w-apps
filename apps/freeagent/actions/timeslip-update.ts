import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, jsonObject } from "../lib/client.ts";

interface Input {
  timeslipId: string;
  fields: unknown;
}

const timeslipUpdate: ActionDefinition<Input> = {
  key: "timeslip-update",
  type: "perform",
  resource: "timeslip",
  title: "Update Timeslip",
  description: "Update fields on an existing timeslip.",
  // A PUT is a full replace of the fields it names; sending the same body
  // twice leaves the timeslip in the same state, so retrying is safe.
  idempotent: true,
  params: [
    { key: "timeslipId", label: "Timeslip ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint:
        'JSON object using FreeAgent\'s field names, e.g. { "hours": "2.0", "comment": "Revised" }.',
    },
  ],
  output: [{ key: "timeslip", type: "object", label: "Timeslip" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/timeslips/${input.timeslipId}`, {
      method: "PUT",
      body: { timeslip: jsonObject(input.fields, "fields") },
    });
  },
};

export default timeslipUpdate;
