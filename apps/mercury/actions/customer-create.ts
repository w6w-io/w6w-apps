import type { ActionDefinition } from "@w6w/types";
import { MercuryClient } from "../lib/client.ts";

/**
 * `POST /ar/customers` — create an accounts-receivable customer. Required:
 * `name`, `email`. `address` is optional and, per the OpenAPI document,
 * nullable — country is a required sub-field the one time an address is
 * given.
 */
interface Input {
  name: string;
  email: string;
  address1?: string;
  address2?: string;
  city?: string;
  region?: string;
  postalCode?: string;
  country?: string;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create an accounts-receivable customer to send invoices to.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
    { key: "address1", label: "Address line 1", type: "string", advanced: true },
    { key: "address2", label: "Address line 2", type: "string", advanced: true },
    { key: "city", label: "City", type: "string", advanced: true },
    {
      key: "region",
      label: "Region / state",
      type: "string",
      advanced: true,
      hint: "Two-letter US state code, or a free-form region for other countries.",
    },
    { key: "postalCode", label: "Postal code", type: "string", advanced: true },
    {
      key: "country",
      label: "Country",
      type: "string",
      advanced: true,
      placeholder: "US",
      hint: "Two-letter ISO 3166-1 alpha-2 code. Required if any other address field is set.",
    },
  ],
  output: [{ key: "customer", type: "object", label: "Created customer" }],

  async execute(input, ctx) {
    const hasAddress = input.address1 || input.city || input.postalCode || input.country;
    const customer = await new MercuryClient(ctx).json("/ar/customers", {
      method: "POST",
      body: {
        name: input.name,
        email: input.email,
        address: hasAddress
          ? {
            name: input.name,
            address1: input.address1,
            address2: input.address2,
            city: input.city,
            region: input.region,
            postalCode: input.postalCode,
            country: input.country,
          }
          : undefined,
      },
    });
    return { customer };
  },
};

export default customerCreate;
