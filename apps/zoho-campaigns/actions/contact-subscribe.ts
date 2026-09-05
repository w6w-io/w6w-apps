import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, ZohoCampaignsClient } from "../lib/client.ts";
import { contactInfo, listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  contactInfo: unknown;
  source?: string;
  topicId?: string;
}

interface Output {
  message?: string;
}

/**
 * `POST /json/listsubscribe` — verified against
 * `https://www.zoho.com/campaigns/help/developers/contact-subscribe.html`.
 * Adds a contact to a list (sending a confirmation email for a signup-form-
 * enabled list) or updates an existing contact's field values. `contactInfo`
 * is JSON-encoded onto the `contactinfo` query parameter — see
 * `lib/client.ts`'s module doc on every parameter travelling as a
 * query-string value, never a body.
 */
const contactSubscribe: ActionDefinition<Input, Output> = {
  key: "contact-subscribe",
  type: "perform",
  resource: "contact",
  title: "Subscribe Contact",
  description:
    "Add a contact to a mailing list, or update field values for an existing one. Requires " +
    '`{ "Contact Email": ... }` in the contact info.',
  idempotent: false,
  params: [
    listKey,
    contactInfo,
    { key: "source", label: "Source", type: "string", hint: "Where this contact came from." },
    { key: "topicId", label: "Topic ID", type: "string" },
  ],
  output: [{ key: "message", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ message?: string }>(
      "listsubscribe",
      {
        method: "POST",
        query: {
          listkey: input.listKey,
          contactinfo: JSON.stringify(parseJsonParam(input.contactInfo, "contactInfo")),
          source: input.source,
          topic_id: input.topicId,
        },
      },
    );
    return { message: body.message };
  },
};

export default contactSubscribe;
