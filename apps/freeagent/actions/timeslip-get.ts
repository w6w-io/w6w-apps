import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";

interface Input {
  timeslipId: string;
}

const timeslipGet: ActionDefinition<Input> = {
  key: "timeslip-get",
  type: "read",
  resource: "timeslip",
  title: "Get Timeslip",
  description: "Get a single timeslip by id.",
  params: [
    { key: "timeslipId", label: "Timeslip ID", type: "string", required: true },
  ],
  output: [{ key: "timeslip", type: "object", label: "Timeslip" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request(`/timeslips/${input.timeslipId}`);
  },
};

export default timeslipGet;
