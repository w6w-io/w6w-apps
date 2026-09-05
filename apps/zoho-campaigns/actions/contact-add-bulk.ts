import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  emailIds: string;
}

interface Output {
  listKey?: string;
  listName?: string;
}

/**
 * `POST /addlistsubscribersinbulk` — verified against
 * `https://www.zoho.com/campaigns/help/developers/add-contacts-existing-list.html`.
 * Adds contacts directly to an EXISTING list (`list-create` is the equivalent
 * for a brand-new one).
 */
const contactAddBulk: ActionDefinition<Input, Output> = {
  key: "contact-add-bulk",
  type: "perform",
  resource: "contact",
  title: "Add Contacts To Existing List",
  description: "Add up to ten comma-separated email addresses to an existing mailing list.",
  idempotent: false,
  params: [
    listKey,
    {
      key: "emailIds",
      label: "Email addresses",
      type: "string",
      required: true,
      hint: "Up to ten, comma-separated.",
    },
  ],
  output: [
    { key: "listKey", type: "string", label: "List key" },
    { key: "listName", type: "string", label: "List name" },
  ],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { listkey?: string; listname?: string }
    >("addlistsubscribersinbulk", {
      method: "POST",
      query: { listkey: input.listKey, emailids: input.emailIds },
    });
    return { listKey: body.listkey, listName: body.listname };
  },
};

export default contactAddBulk;
