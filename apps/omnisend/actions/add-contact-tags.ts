import type { ActionDefinition } from "@w6w/types";
import { OmnisendClient } from "../lib/client.ts";

interface Input {
  tags: string[];
  contactIDs?: string[];
  emails?: string[];
  phones?: string[];
  segmentID?: string;
}

/**
 * Adds tags to contacts selected by ID, email, phone, or segment (selectors
 * combine additively; at least one is required). Tagging runs asynchronously
 * — the 202 response carries no body. https://api-docs.omnisend.com/reference/post_contacts-tags
 */
const addContactTags: ActionDefinition<Input, void> = {
  key: "add-contact-tags",
  type: "perform",
  resource: "contact",
  title: "Batch Add Tags",
  description: "Add tags to contacts selected by IDs, emails, phone numbers, or a segment.",
  idempotent: true,
  params: [
    {
      key: "tags",
      label: "Tags to add",
      type: "json",
      required: true,
      hint: 'Array of strings, e.g. `["vip"]`. Max 100.',
    },
    { key: "contactIDs", label: "Contact IDs", type: "json", hint: "Array of strings. Max 250." },
    { key: "emails", label: "Emails", type: "json", hint: "Array of strings. Max 250." },
    {
      key: "phones",
      label: "Phone numbers (E.164)",
      type: "json",
      hint: "Array of strings. Max 250.",
    },
    { key: "segmentID", label: "Segment ID", type: "string" },
  ],

  execute(input, ctx) {
    const client = new OmnisendClient(ctx);
    return client.request<void>(`/contacts/tags`, {
      method: "POST",
      body: {
        tags: input.tags,
        contactIDs: input.contactIDs,
        emails: input.emails,
        phones: input.phones,
        segmentID: input.segmentID,
      },
    });
  },
};

export default addContactTags;
