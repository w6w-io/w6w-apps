import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PaddleClient } from "../lib/client.ts";
import { customDataParam } from "../lib/params.ts";

/**
 * `POST /customers` — create a customer.
 *
 * Email is the only required field, but `name` is **required later** if the
 * customer is ever billed with `collection_mode: manual` (an invoice), so the
 * hint says so rather than letting that surface as a transaction error weeks
 * afterwards.
 *
 * Not idempotent, and Paddle rejects a duplicate email with a 400 rather than
 * returning the existing customer — so a workflow that may re-run should look
 * the address up with List Customers first.
 */
interface Input {
  email: string;
  name?: string;
  locale?: string;
  customData?: unknown;
}

const customerCreate: ActionDefinition<Input> = {
  key: "customer-create",
  type: "perform",
  resource: "customer",
  title: "Create Customer",
  description: "Create a customer. Paddle rejects an email address that already exists.",
  idempotent: false,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      validation: { minLength: 1, maxLength: 320 },
      hint: "Must be unique — creating a second customer with the same address is rejected.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { maxLength: 1024 },
      hint: "Optional here, but required before this customer can be sent a manual invoice.",
    },
    {
      key: "locale",
      label: "Locale",
      type: "string",
      placeholder: "en",
      hint: "IETF BCP 47 short-form tag. Defaults to `en`.",
    },
    customDataParam,
  ],
  output: [{ key: "data", type: "object", label: "The created customer" }],

  execute(input, ctx) {
    return new PaddleClient(ctx).request("/customers", {
      method: "POST",
      body: compact({
        email: input.email,
        name: input.name,
        locale: input.locale,
        custom_data: asOptionalJson(input.customData, "Custom data"),
      }),
    });
  },
};

export default customerCreate;
