import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `GET /v1/calls/{callId}` — get a call by its unique identifier. */
interface Input {
  callId: string;
}

const callGet: ActionDefinition<Input> = {
  key: "call-get",
  type: "read",
  resource: "call",
  title: "Get Call",
  description: "Get a call by its unique identifier.",
  params: [
    {
      key: "callId",
      label: "Call ID",
      type: "string",
      required: true,
      hint: "The unique identifier of the call.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Call (id, direction, status, duration, answeredAt, answeredBy, initiatedBy, " +
        "completedAt, createdAt, callRoute, forwardedFrom, forwardedTo, aiHandled, " +
        "phoneNumberId, participants, userId)",
    },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/calls/${encodeURIComponent(input.callId)}`);
  },
};

export default callGet;
