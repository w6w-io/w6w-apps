import type { ActionDefinition } from "@w6w/types";
import { GorgiasClient, unset } from "../lib/client.ts";
import { customerOutput } from "../lib/params.ts";

interface Input {
  email?: string;
  name?: string;
  externalId?: string;
  language?: string;
  timezone?: string;
}

/**
 * `POST /customers` — verified against the inline request-body schema on
 * developers.gorgias.com/reference/create-customer (Gorgias has no named
 * `CreateCustomer` component; the schema is declared inline on the
 * operation). `channels` (a list of contact channels) is left out — every
 * field here maps 1:1 to a documented top-level property.
 */
const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer.",
  // Gorgias mints a new customer id per call and has no create-or-update
  // endpoint to converge a retry on.
  idempotent: false,
  params: [
    { key: "email", label: "Email", type: "string", row: "identity" },
    { key: "name", label: "Name", type: "string", row: "identity" },
    { key: "externalId", label: "External ID", type: "string", advanced: true },
    {
      key: "language",
      label: "Language",
      type: "string",
      advanced: true,
      hint: "ISO 639-1 code, e.g. `fr`.",
    },
    {
      key: "timezone",
      label: "Timezone",
      type: "string",
      advanced: true,
      hint: "IANA timezone name, e.g. `Europe/Paris`. Defaults to UTC.",
    },
  ],
  output: customerOutput,

  execute(input, ctx) {
    return new GorgiasClient(ctx).request("/customers", {
      method: "POST",
      body: {
        email: unset(input.email),
        name: unset(input.name),
        external_id: unset(input.externalId),
        language: unset(input.language),
        timezone: unset(input.timezone),
      },
    });
  },
};

export default customerCreate;
