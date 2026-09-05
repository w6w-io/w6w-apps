import type { ActionDefinition } from "@w6w/types";
import { RechargeClient } from "../lib/client.ts";
import { addressIdParam } from "../lib/params.ts";

interface Input {
  addressId: string;
}

/**
 * `GET /addresses/{id}` — retrieve one address. Scope: `read_customers`.
 * Response envelope: `{"address": {...}}`.
 */
const addressGet: ActionDefinition<Input> = {
  key: "address-get",
  type: "read",
  resource: "address",
  title: "Get Address",
  description: "Retrieve one shipping address by its Recharge address id.",
  params: [addressIdParam],
  output: [
    { key: "id", type: "number", label: "Address ID" },
    { key: "customer_id", type: "number", label: "Customer ID" },
    { key: "address1", type: "string", label: "Address line 1" },
    { key: "address2", type: "string", label: "Address line 2" },
    { key: "city", type: "string", label: "City" },
    { key: "province", type: "string", label: "Province / state" },
    { key: "country_code", type: "string", label: "Country code" },
    { key: "zip", type: "string", label: "Zip / postal code" },
    { key: "phone", type: "string", label: "Phone" },
    { key: "company", type: "string", label: "Company" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "payment_method_id", type: "number", label: "Payment method ID" },
    { key: "discounts", type: "array", label: "Applied discounts" },
  ],

  async execute(input, ctx) {
    const client = new RechargeClient(ctx);
    return await client.single(`/addresses/${encodeURIComponent(input.addressId)}`, "address");
  },
};

export default addressGet;
