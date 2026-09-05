import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";
import { subscriberIdentifierParam } from "../lib/params.ts";

/** `GET /v2/subscribers/{email}or{phone}or{ID}` — a single subscriber's profile. */
interface Input {
  identifier: string;
}

const subscriberGet: ActionDefinition<Input> = {
  key: "subscriber-get",
  type: "read",
  resource: "subscriber",
  title: "Get Subscriber",
  description: "Get a subscriber's profile by email address, phone number, or subscriber ID.",
  params: [subscriberIdentifierParam],
  output: [
    { key: "id", type: "string", label: "Subscriber ID" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/subscribers/${encodeURIComponent(input.identifier)}`);
  },
};

export default subscriberGet;
