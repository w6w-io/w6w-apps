import type { ActionDefinition } from "@w6w/types";
import { jsonApiBody, LemonSqueezyClient, relationshipRef } from "../lib/client.ts";

/** `POST /v1/customers` — `store` is a required relationship, not an attribute. */
interface Input {
  storeId: string;
  name: string;
  email: string;
  city?: string;
  region?: string;
  country?: string;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer under a store.",
  idempotent: false,
  params: [
    { key: "storeId", label: "Store ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "city", label: "City", type: "string" },
    { key: "region", label: "Region", type: "string" },
    {
      key: "country",
      label: "Country",
      type: "string",
      hint: "ISO 3166-1 two-letter country code, e.g. `US`, `GB`.",
    },
  ],
  output: [{ key: "data", type: "object", label: "The created Customer object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request("/customers", {
      method: "POST",
      body: jsonApiBody(
        "customers",
        {
          name: input.name,
          email: input.email,
          city: input.city,
          region: input.region,
          country: input.country,
        },
        { store: relationshipRef("stores", input.storeId) },
      ),
    });
  },
};

export default customerCreate;
