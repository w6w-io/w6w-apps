import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";
import { toList } from "../lib/params.ts";

interface Input {
  contactIds: string[] | string;
}

/**
 * `DELETE /api/v2/contacts` — despite the name `contact_ids`, the vendor's
 * own docs describe the array as "phone numbers in E.164 format to delete",
 * not opaque contact-id strings.
 */
const contactBulkDelete: ActionDefinition<Input> = {
  key: "contact-bulk-delete",
  type: "perform",
  resource: "contact",
  title: "Bulk Delete Contacts",
  description: "Delete multiple contacts by phone number (the field is named `contact_ids` but " +
    "takes phone numbers).",
  idempotent: true,
  params: [
    {
      key: "contactIds",
      label: "Phone numbers to delete",
      type: "multiselect",
      required: true,
    },
  ],
  output: [{ key: "amount", type: "number", label: "Number deleted" }],

  execute(input, ctx) {
    const client = new SendblueClient(ctx);
    return client.delete("/api/v2/contacts", { contact_ids: toList(input.contactIds) });
  },
};

export default contactBulkDelete;
