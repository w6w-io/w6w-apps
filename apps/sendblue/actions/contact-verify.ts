import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  number: string;
}

/**
 * `POST /api/v2/contacts/verify` — sends a verification message to a
 * contact. This is the "verify a contact is real" mechanic used to satisfy
 * free-plan messaging restrictions, distinct from the phone-OTP `verify-*`
 * actions (Sendblue's Twilio-style Verify Services product) elsewhere in
 * this app.
 */
const contactVerify: ActionDefinition<Input> = {
  key: "contact-verify",
  type: "perform",
  resource: "contact",
  title: "Verify Contact",
  description: "Send a verification message to a contact (required before messaging them on " +
    "free shared-line plans).",
  idempotent: false,
  params: [
    { key: "number", label: "Phone number", type: "string", required: true },
  ],
  output: [{ key: "status", type: "string", label: "Status" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post("/api/v2/contacts/verify", { number: input.number });
  },
};

export default contactVerify;
