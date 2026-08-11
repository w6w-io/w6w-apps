import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /contacts` — search contacts.
 *
 * Filters and sorts are **bracketed query parameters** — `query[email]`,
 * `query[createdOn][from]`, `sort[createdOn]` — so this action takes ordinary
 * fields and `buildQuery` flattens them into those names.
 *
 * Dates are ISO 8601. `query[createdOn][from]` and `[to]` bound subscription
 * date; `changedOn` bounds the last edit, which is the one to poll on if you
 * want contacts whose data changed rather than contacts newly added.
 *
 * `fields` is worth using on a large list: a contact record is wide, and naming
 * the handful you need keeps the response small.
 */
interface Input {
  email?: string;
  name?: string;
  campaignId?: string;
  origin?: string;
  createdFrom?: string;
  createdTo?: string;
  changedFrom?: string;
  changedTo?: string;
  sortBy?: string;
  sortDirection?: string;
  fields?: string;
  page?: number;
  perPage?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Search contacts by email, name, campaign, origin or date range.",
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      hint: "Matches on email address. The fastest way to find one contact.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "campaignId",
      label: "Campaign ID",
      type: "string",
      hint: "Only contacts on this campaign (GetResponse's word for a list).",
    },
    {
      key: "origin",
      label: "Origin",
      type: "select",
      options: [
        { value: "import", label: "Import" },
        { value: "email", label: "Email" },
        { value: "www", label: "Web form" },
        { value: "panel", label: "Panel" },
        { value: "leads", label: "Leads" },
        { value: "sale", label: "Sale" },
        { value: "api", label: "API" },
        { value: "forward", label: "Forward" },
        { value: "survey", label: "Survey" },
        { value: "iphone", label: "iPhone" },
        { value: "copy", label: "Copy" },
        { value: "landing_page", label: "Landing page" },
        { value: "summary", label: "Summary" },
      ],
      hint: "How the contact was added.",
    },
    {
      key: "createdFrom",
      label: "Subscribed on or after",
      type: "datetime",
      hint: "ISO 8601. Bounds when the contact subscribed.",
    },
    { key: "createdTo", label: "Subscribed on or before", type: "datetime" },
    {
      key: "changedFrom",
      label: "Changed on or after",
      type: "datetime",
      hint: "Bounds the last edit — the right cursor for polling for updates.",
    },
    { key: "changedTo", label: "Changed on or before", type: "datetime" },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "email", label: "Email" },
        { value: "name", label: "Name" },
        { value: "createdOn", label: "Subscription date" },
        { value: "changedOn", label: "Change date" },
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
    {
      key: "fields",
      label: "Fields",
      type: "string",
      placeholder: "contactId,email,name",
      hint: "Comma-separated. Returns only these fields — worth using on a large list.",
    },
    { key: "page", label: "Page", type: "number", validation: { integer: true, min: 1 } },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      validation: { integer: true, min: 1, max: 1000 },
      hint: "Default 100, maximum 1000.",
    },
  ],
  output: [{ key: "[]", type: "array", label: "Contacts — a bare array, not an envelope" }],

  execute(input, ctx) {
    const query = buildQuery({
      query: {
        email: input.email,
        name: input.name,
        campaignId: input.campaignId,
        origin: input.origin,
        createdOn: { from: input.createdFrom, to: input.createdTo },
        changedOn: { from: input.changedFrom, to: input.changedTo },
      },
      sort: input.sortBy ? { [input.sortBy]: input.sortDirection ?? "ASC" } : undefined,
      fields: input.fields,
      page: input.page,
      perPage: input.perPage,
    });
    return new GetResponseClient(ctx).request("/contacts", { query });
  },
};

export default contactList;
