import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  number: string;
  optedOut?: boolean;
}

/**
 * `POST /api/v2/contacts/opt-out` — opts a contact out of (or, with
 * `opted_out: false`, back into) receiving messages. Outbound messages to an
 * opted-out number are blocked.
 */
const contactOptOut: ActionDefinition<Input> = {
  key: "contact-opt-out",
  type: "perform",
  resource: "contact",
  title: "Opt Out Contact",
  description: "Opt a contact out (default) or back in (optedOut = false) from receiving " +
    "messages.",
  idempotent: true,
  params: [
    { key: "number", label: "Phone number", type: "string", required: true },
    { key: "optedOut", label: "Opted out", type: "boolean", default: true },
  ],
  output: [
    { key: "number", type: "string", label: "Number" },
    { key: "opted_out", type: "boolean", label: "Opt-out state" },
  ],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post("/api/v2/contacts/opt-out", {
      number: input.number,
      opted_out: input.optedOut ?? true,
    });
  },
};

export default contactOptOut;
