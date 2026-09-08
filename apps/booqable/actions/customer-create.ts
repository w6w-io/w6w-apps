import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  name?: string;
  email?: string;
  legalType?: "person" | "commercial";
  depositType?: "none" | "percentage" | "percentage_total" | "fixed" | "default";
  depositValue?: number;
  discountPercentage?: number;
  emailMarketingConsented?: boolean;
  tagList?: string;
  taxRegionId?: string;
}

/**
 * `POST /customers` — verified against developers.booqable.com ("Create a
 * customer"). Booqable's own request-body table marks no field required
 * (even `name`/`email`, both optional there), so none is marked required
 * here either. `properties_attributes` (nested custom-property writes) is
 * left out — its shape depends on the account's own configured Properties
 * and isn't one this app can express safely as a fixed Param.
 */
const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer.",
  // Booqable mints a new id per call and has no create-or-update endpoint to
  // converge a retry on.
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", hint: "Person or company name." },
    { key: "email", label: "Email", type: "string" },
    {
      key: "legalType",
      label: "Legal type",
      type: "select",
      options: [
        { value: "person", label: "Person" },
        { value: "commercial", label: "Commercial" },
      ],
      advanced: true,
    },
    {
      key: "depositType",
      label: "Default deposit type",
      type: "select",
      options: [
        { value: "default", label: "Account default" },
        { value: "none", label: "None" },
        { value: "percentage", label: "Percentage of item prices" },
        { value: "percentage_total", label: "Percentage of order total" },
        { value: "fixed", label: "Fixed amount" },
      ],
      hint: "Deposit applied by default to new orders for this customer.",
      advanced: true,
    },
    {
      key: "depositValue",
      label: "Deposit value",
      type: "number",
      hint: "The percentage or fixed amount used by `depositType`.",
      advanced: true,
    },
    {
      key: "discountPercentage",
      label: "Default discount %",
      type: "number",
      hint: "Default discount applied to each new order for this customer.",
      advanced: true,
    },
    {
      key: "emailMarketingConsented",
      label: "Email marketing consented",
      type: "boolean",
      advanced: true,
    },
    {
      key: "tagList",
      label: "Tags",
      type: "string",
      hint: "Comma-separated, case-insensitive tags.",
      advanced: true,
    },
    { key: "taxRegionId", label: "Tax region ID", type: "string", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The created Customer object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request("/customers", {
      method: "POST",
      body: jsonApiBody("customers", {
        name: input.name,
        email: input.email,
        legal_type: input.legalType,
        deposit_type: input.depositType,
        deposit_value: input.depositValue,
        discount_percentage: input.discountPercentage,
        email_marketing_consented: input.emailMarketingConsented,
        tag_list: input.tagList ? input.tagList.split(",").map((s) => s.trim()) : undefined,
        tax_region_id: input.taxRegionId,
      }),
    });
  },
};

export default customerCreate;
