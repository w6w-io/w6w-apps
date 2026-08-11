import type { ActionDefinition } from "@w6w/types";
import { compact, TidyCalClient } from "../lib/client.ts";

/**
 * `POST /api/contacts` — add a contact without a booking.
 *
 * **This one operation is gated on a lifetime subscription.** TidyCal documents
 * a `402 Payment Required — Lifetime subscription required` response here and
 * nowhere else in the API. A paid plan is enough to *use* the API; it is not
 * enough to use this. Nothing exposes the entitlement in advance — the closest
 * signal is `lifetime_pro_at` on Get account, which is a timestamp on the
 * account rather than a statement about this endpoint — so a `402` surfaces as
 * a thrown error carrying TidyCal's own message.
 *
 * `idempotent: false`. No idempotency key exists, and TidyCal documents no
 * uniqueness constraint on a contact's email, so a retry may create a duplicate.
 */
interface Input {
  name: string;
  email: string;
  timezone?: string;
}

const contactCreate: ActionDefinition<Input> = {
  key: "contact-create",
  type: "perform",
  resource: "contact",
  title: "Create contact",
  description:
    "Create a contact. Requires a TidyCal lifetime subscription — otherwise TidyCal answers 402.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      placeholder: "America/Los_Angeles",
      hint: "IANA timezone name. Optional here, unlike on Create booking.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created contact" }],

  execute(input, ctx) {
    return new TidyCalClient(ctx).json("/contacts", {
      method: "POST",
      body: compact({ name: input.name, email: input.email, timezone: input.timezone }),
    });
  },
};

export default contactCreate;
