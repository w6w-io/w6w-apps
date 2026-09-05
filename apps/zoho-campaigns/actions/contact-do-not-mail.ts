import type { ActionDefinition } from "@w6w/types";
import { parseJsonParam, ZohoCampaignsClient } from "../lib/client.ts";
import { contactInfo } from "../lib/params.ts";

interface Input {
  contactInfo: unknown;
}

interface Output {
  message?: string;
}

/**
 * `POST /json/contactdonotmail` — verified against
 * `https://www.zoho.com/campaigns/help/developers/do-not-mail.html`. Moves a
 * contact to the account-wide Do-Not-Mail registry — unlike unsubscribe,
 * this is not scoped to one list. The vendor documents `0`/"success" for a
 * contact already on the registry, so calling this twice on the same
 * address is not an error.
 */
const contactDoNotMail: ActionDefinition<Input, Output> = {
  key: "contact-do-not-mail",
  type: "perform",
  resource: "contact",
  title: "Move Contact To Do-Not-Mail",
  description:
    'Move a contact to the account-wide Do-Not-Mail registry. Requires `{ "Contact Email": ' +
    "... }` in the contact info.",
  idempotent: true,
  params: [contactInfo],
  output: [{ key: "message", type: "string", label: "Result message" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ message?: string }>(
      "contactdonotmail",
      {
        method: "POST",
        query: { contactinfo: JSON.stringify(parseJsonParam(input.contactInfo, "contactInfo")) },
      },
    );
    return { message: body.message };
  },
};

export default contactDoNotMail;
