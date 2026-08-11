import type { ActionDefinition } from "@w6w/types";
import { buildQuery, GetResponseClient } from "../lib/client.ts";

/**
 * `GET /campaigns` — the account's lists.
 *
 * GetResponse calls a contact list a **campaign**, which is worth stating
 * because "campaign" means a send in most other marketing tools. Every contact
 * belongs to one, and its `campaignId` is what Create Contact and Create
 * Newsletter both require — so this is usually the first call a workflow makes.
 */
interface Input {
  name?: string;
  isDefault?: boolean;
  sortBy?: string;
  sortDirection?: string;
  page?: number;
  perPage?: number;
}

const campaignList: ActionDefinition<Input> = {
  key: "campaign-list",
  type: "search",
  resource: "campaign",
  title: "List Campaigns (Lists)",
  description:
    "List the account's campaigns — GetResponse's word for contact lists. Start here for the " +
    "campaign id the contact and newsletter actions need.",
  params: [
    { key: "name", label: "Name", type: "string", hint: "Filter by campaign name." },
    {
      key: "isDefault",
      label: "Default only",
      type: "boolean",
      hint: "Return only the account's default campaign.",
    },
    {
      key: "sortBy",
      label: "Sort by",
      type: "select",
      options: [
        { value: "name", label: "Name" },
        { value: "createdOn", label: "Creation date" },
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
      hint: "Default 100, maximum 1000.",
    },
  ],
  output: [{ key: "[]", type: "array", label: "Campaigns — `campaignId` is the id to reuse" }],

  execute(input, ctx) {
    const query = buildQuery({
      query: {
        name: input.name,
        // The API takes this as a string flag, not a JSON boolean.
        isDefault: input.isDefault === undefined ? undefined : input.isDefault ? "true" : "false",
      },
      sort: input.sortBy ? { [input.sortBy]: input.sortDirection ?? "ASC" } : undefined,
      page: input.page,
      perPage: input.perPage,
    });
    return new GetResponseClient(ctx).request("/campaigns", { query });
  },
};

export default campaignList;
