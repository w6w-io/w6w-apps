import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey } from "../lib/params.ts";

interface Input {
  listKey: string;
  status?: "active" | "unsub" | "bounce" | "spam";
}

interface Output {
  noOfContacts?: number;
}

/**
 * `GET /listsubscriberscount` — verified against
 * `https://www.zoho.com/campaigns/help/developers/view-total-contacts.html`.
 */
const listCount: ActionDefinition<Input, Output> = {
  key: "list-count",
  type: "read",
  resource: "list",
  title: "Get Total Contacts",
  description: "Get the number of contacts in a mailing list, optionally filtered by status.",
  params: [
    listKey,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "unsub", label: "Unsubscribed" },
        { value: "bounce", label: "Bounced" },
        { value: "spam", label: "Marked as spam" },
      ],
      hint: "Leave unset to count every status.",
    },
  ],
  output: [{ key: "noOfContacts", type: "number", label: "Total contacts" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<{ no_of_contacts?: number }>(
      "listsubscriberscount",
      { query: { listkey: input.listKey, status: input.status } },
    );
    return { noOfContacts: body.no_of_contacts };
  },
};

export default listCount;
