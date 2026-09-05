import type { ActionDefinition } from "@w6w/types";
import { TelnyxClient } from "../lib/client.ts";

interface Input {
  id: string;
}

/**
 * `GET /messages/{id}` — look up a previously sent (or received) message by
 * its ID to read its current per-recipient delivery status. The OpenAPI
 * document types the response as `oneOf` an outbound or inbound message
 * payload; both share the same envelope and this app returns whichever one
 * comes back verbatim.
 */
const getMessage: ActionDefinition<Input> = {
  key: "get-message",
  type: "read",
  resource: "message",
  title: "Get Message",
  description: "Look up a message by its ID, including its current delivery status.",
  params: [
    {
      key: "id",
      label: "Message ID",
      type: "string",
      required: true,
      hint: "The `id` returned by Send Message.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The message" }],

  execute(input, ctx) {
    return new TelnyxClient(ctx).data(`/messages/${encodeURIComponent(input.id)}`);
  },
};

export default getMessage;
