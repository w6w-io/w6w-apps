import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

interface Input {
  phoneNumber: string;
}

/**
 * `POST /v3/verified-contacts` — note the bare `/v3/` prefix, with no `/api`
 * segment at all; every other write in this app lives under `/api/...`. Idempotent
 * per the vendor's own description ("creates or returns"): calling it again
 * for the same number returns the existing pending/verified record rather
 * than erroring. The contact becomes `verified` only after it sends any
 * inbound iMessage/SMS to the returned shared line — there is no way to force
 * verification from this side.
 */
const verifiedContactCreate: ActionDefinition<Input> = {
  key: "verified-contact-create",
  type: "perform",
  resource: "verified-contact",
  title: "Create Pending Verified Contact",
  description: "Create (or return the existing) verified-contact route for the account's " +
    "shared iMessage line. Becomes verified once the contact texts that line.",
  idempotent: true,
  params: [
    { key: "phoneNumber", label: "Contact phone number", type: "string", required: true },
  ],
  output: [{ key: "data", type: "object", label: "Verified-contact record" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.post("/v3/verified-contacts", { phone_number: input.phoneNumber });
  },
};

export default verifiedContactCreate;
