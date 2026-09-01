import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { asOptionalJson, metadataParam, testmodeParam } from "../lib/params.ts";

/** `POST /v2/customers` — create a customer. Every field is optional. */
interface Input {
  name?: string;
  email?: string;
  locale?: string;
  metadata?: unknown;
  testmode?: boolean;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer, for repeat/recurring payments and payment-method mandates.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    { key: "locale", label: "Locale", type: "string", advanced: true, placeholder: "nl_NL" },
    metadataParam,
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Customer ID (cst_*)" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      "/customers",
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

export default customerCreate;
