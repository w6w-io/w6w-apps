import type { ActionDefinition } from "@w6w/types";
import { ServiceM8Client } from "../lib/client.ts";

/**
 * `GET /vendor.json` — the connected ServiceM8 account's own business profile
 * (name, email, currency, business hours, invoice terms, …). There is exactly
 * one Vendor per account; this returns it directly rather than the raw array
 * `listVendors` answers, since a "which one" picker makes no sense here.
 */
const vendorGet: ActionDefinition<Record<string, never>, unknown> = {
  key: "vendor-get",
  type: "read",
  resource: "vendor",
  title: "Get Account Info",
  description: "The connected ServiceM8 account's own business profile — name, email, currency, " +
    "business hours, invoice terms.",
  params: [],
  output: [
    { key: "uuid", type: "string", label: "Vendor UUID" },
    { key: "name", type: "string", label: "Company name" },
    { key: "email", type: "string", label: "Primary email address" },
    { key: "currency", type: "string", label: "Three-letter ISO currency code" },
    { key: "timezone_name", type: "string", label: "IANA timezone name" },
  ],

  async execute(_input, ctx) {
    const { items } = await new ServiceM8Client(ctx).list("/vendor.json");
    return items[0] ?? null;
  },
};

export default vendorGet;
