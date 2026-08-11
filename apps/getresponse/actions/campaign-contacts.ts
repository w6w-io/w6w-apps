import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /campaigns/{campaignId}/contacts` — the contacts on one list.
 *
 * The same thing as List Contacts filtered by campaign, and it exists because
 * that is the question people actually ask ("who is on this list?"). It takes
 * the same date filters, which makes it the natural polling endpoint for "who
 * joined this list since I last looked".
 */
interface Input {
  campaignId: string;
  name?: string;
  email?: string;
  createdFrom?: string;
  createdTo?: string;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  perPage?: number;
}

const campaignContacts: ActionDefinition<Input> = {
  key: "campaign-contacts",
  type: "search",
  resource: "contact",
  title: "List Campaign Contacts",
  description: "List the contacts on one campaign (list), with the same filters as List Contacts.",
  params: [
    { key: "campaignId", label: "Campaign ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "email", label: "Email", type: "string" },
    {
      key: "createdFrom",
      label: "Subscribed on or after",
      type: "datetime",
      hint: "ISO 8601. The natural cursor for polling a list for new subscribers.",
    },
    { key: "createdTo", label: "Subscribed on or before", type: "datetime" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "email", label: "Email" },
        { value: "name", label: "Name" },
        { value: "createdOn", label: "Subscription date" },
      ],
    },
    {
      key: "sortDirection",
      label: "Sort direction",
      type: "select",
      options: [
        { value: "ASC", label: "Ascending" },
        { value: "DESC", label: "Descending" },
      ],
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
    },
  ],
  output: [{ key: "[]", type: "array", label: "Contacts on this campaign" }],

  execute(input, ctx) {
    const query = buildQuery({
      query: {
        name: input.name,
        email: input.email,
        createdOn: { from: input.createdFrom, to: input.createdTo },
      },
      sort: input.sortBy ? { [input.sortBy]: input.sortDirection ?? "ASC" } : undefined,
      page: input.page,
      perPage: input.perPage,
    });
    return new GetResponseClient(ctx).request(
      `/campaigns/${encodeURIComponent(input.campaignId)}/contacts`,
      { query },
    );
  },
};

export default campaignContacts;
