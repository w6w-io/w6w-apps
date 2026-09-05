import type { ActionDefinition } from "@w6w/types";
import { compact, RechargeClient } from "../lib/client.ts";
import { addressIdParam } from "../lib/params.ts";

interface Input {
  addressId: string;
  address1?: string;
  address2?: string;
  city?: string;
  company?: string;
  countryCode?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  province?: string;
  zip?: string;
  paymentMethodId?: number;
  discountCodes?: unknown;
}

/**
 * `PUT /addresses/{id}` — update an address. Scope: `write_customers`.
 *
 * Two documented gotchas this action follows exactly:
 *
 *  - Updating `country_code` requires also sending `zip`, or the API returns
 *    a validation error — this action leaves both optional but the caller is
 *    responsible for pairing them, per the reference's own note.
 *  - `discounts` is an array, but only its first entry is ever applied; to
 *    remove all discounts, pass an empty array (`[]`).
 *
 * Response envelope: `{"address": {...}}`. Re-sending the same values is a
 * no-op on the server, so this is safe to retry.
 */
const addressUpdate: ActionDefinition<Input> = {
  key: "address-update",
  type: "perform",
  resource: "address",
  title: "Update Address",
  description: "Modify an existing address's fields. Only the fields provided are changed.",
  idempotent: true,
  params: [
    addressIdParam,
    { key: "address1", label: "Address line 1", type: "string" },
    { key: "address2", label: "Address line 2", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "company", label: "Company", type: "string" },
    {
      key: "countryCode",
      label: "Country code",
      type: "string",
      hint: "2-letter code. Must be sent together with Zip when either changes.",
    },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    { key: "phone", label: "Phone", type: "string" },
    { key: "province", label: "Province / state", type: "string" },
    { key: "zip", label: "Zip / postal code", type: "string" },
    { key: "paymentMethodId", label: "Payment method ID", type: "number" },
    {
      key: "discountCodes",
      label: "Discount codes",
      type: "json",
      hint: 'Array of {"code": "..."} objects. Only the first is applied. Pass [] to remove all ' +
        "discounts from the address.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Address ID" },
    { key: "updated_at", type: "string", label: "Updated at" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(`/addresses/${encodeURIComponent(input.addressId)}`, "address", {
      method: "PUT",
      body: compact({
        address1: input.address1,
        address2: input.address2,
        city: input.city,
        company: input.company,
        country_code: input.countryCode,
        first_name: input.firstName,
        last_name: input.lastName,
        phone: input.phone,
        province: input.province,
        zip: input.zip,
        payment_method_id: input.paymentMethodId,
        discounts: input.discountCodes,
      }),
    });
  },
};

export default addressUpdate;
