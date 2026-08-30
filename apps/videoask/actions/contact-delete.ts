import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { contactIdParam, formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `DELETE /contacts/{contact_id}?form_id={form_id}` — "Delete a response".
 * Unlike every other contact/conversation endpoint, `form_id` here is a query
 * parameter, not a path segment — confirmed against the vendor's own example
 * URL.
 */
interface Input {
  contactId: string;
  formId: string;
  organizationId?: string;
}

const contactDelete: ActionDefinition<Input> = {
  key: "contact-delete",
  type: "perform",
  resource: "contact",
  title: "Delete Response",
  description: "Permanently delete a contact's response (answers and messages) to a form.",
  idempotent: true,
  params: [contactIdParam, formIdParam, organizationIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new VideoAskClient(ctx).status(
      `/contacts/${encodeId(input.contactId)}`,
      { method: "DELETE", query: { form_id: input.formId }, organizationId: input.organizationId },
    );
    return { status };
  },
};

export default contactDelete;
