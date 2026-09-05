import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient } from "../lib/client.ts";

/**
 * `PATCH /v1/customers/:id`.
 *
 * `status` accepts only `archived` on this endpoint — the customer object's
 * other status values (`subscribed`, `unsubscribed`, `requires_verification`,
 * `invalid_email`, `bounced`) are read-only states Lemon Squeezy sets itself.
 */
interface Input {
  customerId: string;
  name?: string;
  email?: string;
  city?: string;
  region?: string;
  country?: string;
  archive?: boolean;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's details, or archive it. Only filled-in fields are sent.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "region", label: "Region", type: "string" },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "ISO 3166-1 two-letter country code, e.g. `US`, `GB`.",
    },
    {
      key: "archive",
      label: "Archive",
      type: "boolean",
      hint: "Set the customer's marketing status to `archived`. The only status value this " +
        "endpoint accepts — the others are set by Lemon Squeezy itself.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The updated Customer object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/customers/${encodeURIComponent(input.customerId)}`,
      {
        method: "PATCH",
        body: jsonApiBody(
          "customers",
          {
            name: input.name,
            email: input.email,
            city: input.city,
            region: input.region,
            country: input.country,
            status: input.archive ? "archived" : undefined,
          },
          undefined,
          input.customerId,
        ),
      },
    );
  },
};

export default customerUpdate;
