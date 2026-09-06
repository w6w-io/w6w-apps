import type { ActionDefinition } from "@w6w/types";
import { BooqableClient, jsonApiBody } from "../lib/client.ts";

interface Input {
  customerId: string;
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

/** `PUT /customers/{id}` — verified against developers.booqable.com ("Update a customer"). */
const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update fields on an existing customer. Only fields you set are changed.",
  idempotent: true,
  params: [
    { key: "customerId", label: "Customer ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
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
      advanced: true,
    },
    { key: "depositValue", label: "Deposit value", type: "number", advanced: true },
    {
      key: "discountPercentage",
      label: "Default discount %",
      type: "number",
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
      hint: "Comma-separated, case-insensitive tags. Replaces the existing list.",
      advanced: true,
    },
    { key: "taxRegionId", label: "Tax region ID", type: "string", advanced: true },
  ],
  output: [{ key: "data", type: "object", label: "The updated Customer object" }],

  execute(input, ctx) {
    return new BooqableClient(ctx).request(`/customers/${input.customerId}`, {
      method: "PUT",
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
      }, input.customerId),
    });
  },
};

export default customerUpdate;
