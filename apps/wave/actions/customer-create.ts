import type { ActionDefinition } from "@w6w/types";
import { compact, CUSTOMER_FIELDS, unwrap, WaveClient } from "../lib/client.ts";

interface Input {
  businessId: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  currency?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  provinceCode?: string;
  countryCode?: string;
  postalCode?: string;
}

/**
 * `inputErrors` is selected on purpose and is not optional decoration: a
 * rejected create arrives as HTTP 200 with `didSucceed: false`, `customer:
 * null` and the reason in this array. `unwrap` turns that into a thrown error.
 */
const MUTATION = `
  mutation CreateCustomer($input: CustomerCreateInput!) {
    customerCreate(input: $input) {
      didSucceed
      inputErrors { code message path }
      customer { ${CUSTOMER_FIELDS} }
    }
  }
`;

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer under a business. Fails loudly on Wave's `inputErrors`.",
  idempotent: false,
  params: [
    { key: "businessId", label: "Business ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string", required: true },
    { key: "firstName", label: "First name", type: "string", row: "name2" },
    { key: "lastName", label: "Last name", type: "string", row: "name2" },
    { key: "email", label: "Email", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "currency",
      label: "Currency",
      type: "string",
      hint: "3-letter ISO currency code, e.g. USD, CAD.",
      advanced: true,
    },
    { key: "addressLine1", label: "Address line 1", type: "string", row: "addr1" },
    { key: "addressLine2", label: "Address line 2", type: "string", row: "addr1", advanced: true },
    { key: "city", label: "City", type: "string", row: "addr2" },
    { key: "provinceCode", label: "Province/state code", type: "string", row: "addr2" },
    { key: "countryCode", label: "Country code", type: "string", row: "addr3" },
    { key: "postalCode", label: "Postal code", type: "string", row: "addr3" },
  ],
  output: [{ key: "customer", type: "object", label: "The created customer" }],

  async execute(input, ctx) {
    const address = compact({
      addressLine1: input.addressLine1,
      addressLine2: input.addressLine2,
      city: input.city,
      provinceCode: input.provinceCode,
      countryCode: input.countryCode,
      postalCode: input.postalCode,
    });

    const data = await new WaveClient(ctx).query<Record<string, unknown>>(MUTATION, {
      input: compact({
        businessId: input.businessId,
        name: input.name,
        firstName: input.firstName,
        lastName: input.lastName,
        email: input.email,
        phone: input.phone,
        currency: input.currency,
        address: Object.keys(address).length ? address : undefined,
      }),
    });

    return unwrap(data, "customerCreate");
  },
};

export default customerCreate;
