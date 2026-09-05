import type { ActionDefinition } from "@w6w/types";
import { compact, HeartbeatClient } from "../lib/client.ts";
import { RICH_TEXT_HINT } from "../lib/params.ts";

/**
 * `PUT /v0/directMessages` — send a direct message.
 *
 * Heartbeat documents this as `204 No Content` — confirmed, unlike most of
 * this app's other `perform` actions, so nothing is guessed about the
 * response shape here.
 */
interface Input {
  to: string;
  text: string;
  from?: string;
}

const createDirectMessage: ActionDefinition<Input> = {
  key: "create-direct-message",
  type: "perform",
  resource: "direct-message",
  title: "Send Direct Message",
  description: "Send a direct message to a user.",
  idempotent: false,
  params: [
    { key: "to", label: "To (user ID)", type: "string", required: true },
    { key: "text", label: "Content", type: "text", required: true, hint: RICH_TEXT_HINT },
    {
      key: "from",
      label: "From (user ID)",
      type: "string",
      hint: "Must be an admin. Defaults to the user who created the API key.",
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new HeartbeatClient(ctx).json("/directMessages", {
      method: "PUT",
      body: compact({ text: input.text, to: input.to, from: input.from }),
    });
    return {};
  },
};

export default createDirectMessage;
