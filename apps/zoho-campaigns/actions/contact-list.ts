import type { ActionDefinition } from "@w6w/types";
import { ZohoCampaignsClient } from "../lib/client.ts";
import { listKey, pagingParams } from "../lib/params.ts";

interface Input {
  listKey: string;
  status?: "active" | "recent" | "mostrecent" | "unsub" | "bounce";
  sort?: "asc" | "desc";
  fromindex?: number;
  range?: number;
}

interface Output {
  contacts: Array<Record<string, unknown>>;
}

/**
 * `GET /getlistsubscribers` — verified against
 * `https://www.zoho.com/campaigns/help/developers/get-list-subscribers.html`.
 * The payload key is `list_of_details` in the vendor's own sample JSON
 * response (despite the XML sample nesting it under `result_of_subscribers`
 * — the two samples on that page disagree; this app follows the JSON one
 * since it only ever requests JSON).
 */
const contactList: ActionDefinition<Input, Output> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts In Mailing List",
  description: "List the contacts in a mailing list, optionally filtered by status.",
  params: [
    listKey,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "active", label: "Active" },
        { value: "recent", label: "Recent" },
        { value: "mostrecent", label: "Most recent" },
        { value: "unsub", label: "Unsubscribed" },
        { value: "bounce", label: "Bounced" },
      ],
    },
    ...pagingParams,
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  async execute(input, ctx) {
    const body = await new ZohoCampaignsClient(ctx).request<
      { list_of_details?: Array<Record<string, unknown>> }
    >("getlistsubscribers", {
      query: {
        listkey: input.listKey,
        status: input.status,
        sort: input.sort,
        fromindex: input.fromindex,
        range: input.range,
      },
    });
    return { contacts: body.list_of_details ?? [] };
  },
};

export default contactList;
