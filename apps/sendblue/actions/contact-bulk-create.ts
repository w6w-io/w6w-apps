import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";
import { asJson } from "../lib/params.ts";

interface Input {
  contacts: unknown;
}

interface BulkContact {
  phone: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  tags?: string[];
  custom_variables?: Record<string, string>;
}

/** `POST /api/v2/contacts/bulk` — create multiple contacts in one call. */
const contactBulkCreate: ActionDefinition<Input> = {
  key: "contact-bulk-create",
  type: "perform",
  resource: "contact",
  title: "Bulk Create Contacts",
  description: "Create multiple contacts in one call.",
  idempotent: false,
  params: [
    {
      key: "contacts",
      label: "Contacts (JSON array)",
      type: "json",
      required: true,
      hint: '[{"phone": "+15551234567", "first_name": "Jane", "tags": ["vip"]}, ...]',
    },
  ],
  output: [{ key: "contacts", type: "array", label: "Created contacts" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    const contacts = asJson<BulkContact[]>(input.contacts, "contacts");
    return client.post("/api/v2/contacts/bulk", { contacts });
  },
};

export default contactBulkCreate;
