import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { contactIdParam, formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `GET /forms/{form_id}/contacts/{contact_id}` — one respondent's contact
 * record, optionally expanded with their answers and messages.
 *
 * The vendor's own collection flags this endpoint specifically: "⚠️ This
 * endpoint is subject to a rate limit of 50 requests per 5 minutes" — the
 * only per-endpoint (rather than account-wide) rate limit documented
 * anywhere in the collection. Polling this in a tight loop across many
 * contacts will start returning 429s well before any other call in this app
 * does.
 */
interface Input {
  formId: string;
  contactId: string;
  includeAnswers?: boolean;
  includeMessages?: boolean;
  organizationId?: string;
}

const contactGet: ActionDefinition<Input> = {
  key: "contact-get",
  type: "read",
  resource: "contact",
  title: "Get Contact",
  description:
    "Fetch a single contact's record, with its answers and messages. Rate-limited by the " +
    "vendor to 50 requests per 5 minutes.",
  params: [
    formIdParam,
    contactIdParam,
    { key: "includeAnswers", label: "Include answers", type: "boolean", default: true },
    { key: "includeMessages", label: "Include messages", type: "boolean", default: true },
    organizationIdParam,
  ],
  output: [{ key: "result", type: "object", label: "The contact" }],

  async execute(input, ctx) {
    const result = await new VideoAskClient(ctx).entity(
      `/forms/${encodeId(input.formId)}/contacts/${encodeId(input.contactId)}`,
      {
        query: {
          include_answers: input.includeAnswers ?? true,
          include_messages: input.includeMessages ?? true,
        },
        organizationId: input.organizationId,
      },
    );
    return { result };
  },
};

export default contactGet;
