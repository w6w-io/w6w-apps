import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { asOptionalJson, customerIdParam, metadataParam, testmodeParam } from "../lib/params.ts";

interface Input {
  customerId: string;
  name?: string;
  email?: string;
  locale?: string;
  metadata?: unknown;
  testmode?: boolean;
}

const customerUpdate: ActionDefinition<Input> = {
  key: "customer-update",
  type: "perform",
  resource: "customer",
  title: "Update Customer",
  description: "Update a customer's name, email, locale or metadata.",
  idempotent: true,
  params: [
    customerIdParam(),
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "locale", label: "Locale", type: "string", advanced: true },
    metadataParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).patch(
      `/customers/${encodeURIComponent(input.customerId)}`,
      compact({
        name: input.name,
        email: input.email,
        locale: input.locale,
        metadata: asOptionalJson(input.metadata, "metadata"),
        testmode: input.testmode,
      }),
    );
  },
};

export default customerUpdate;
