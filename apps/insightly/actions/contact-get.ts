import type { ActionDefinition } from "@w6w/types";
import { InsightlyClient } from "../lib/client.ts";

interface Input {
  contactId: number;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description: "Fetch a single contact by ID.",
  params: [
    { key: "contactId", label: "Contact ID", type: "number", required: true },
  ],
  output: [
    { key: "CONTACT_ID", type: "number", label: "Contact ID" },
    { key: "FIRST_NAME", type: "string", label: "First name" },
    { key: "LAST_NAME", type: "string", label: "Last name" },
    { key: "EMAIL_ADDRESS", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    return new InsightlyClient(ctx).request(`/Contacts/${input.contactId}`);
  },
};

export default contactGet;
