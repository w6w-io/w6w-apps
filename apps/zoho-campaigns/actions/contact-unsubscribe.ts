import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, ZohoCampaignsClient } from "../lib/client.ts";
import { contactInfo, listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  contactInfo: unknown;
  topicId?: string;
}

interface Output {
  message?: string;
}

/**
 * `POST /json/listunsubscribe` — verified against
 * `https://www.zoho.com/campaigns/help/developers/contact-unsubscribe.html`.
 */
const contactUnsubscribe: ActionDefinition<Input, Output> = {
  key: "contact-unsubscribe",
  type: "perform",
  resource: "contact",
  title: "Unsubscribe Contact",
  description:
    'Unsubscribe a contact from a mailing list. Requires `{ "Contact Email": ... }` in the ' +
    "contact info.",
  idempotent: true,
  params: [
    listKey,
    contactInfo,
    { key: "topicId", label: "Topic ID", type: "string" },
  ],
  output: [{ key: "message", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ message?: string }>(
      "listunsubscribe",
      {
        method: "POST",
        query: {
          listkey: input.listKey,
          contactinfo: JSON.stringify(parseJsonParam(input.contactInfo, "contactInfo")),
          topic_id: input.topicId,
        },
      },
    );
    return { message: body.message };
  },
};

export default contactUnsubscribe;
