import type { ActionDefinition } from "@w6w/types";
import { compact, TextMagicClient, type TmPage } from "../lib/client.ts";
import { orderingParams, paginationParams } from "../lib/params.ts";

/** `GET /api/v2/contacts` — this account's contacts. */
interface Input {
  page?: number;
  limit?: number;
  shared?: number;
  orderBy?: string;
  direction?: "asc" | "desc";
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts, optionally including ones shared by other sub-accounts.",
  params: [
    ...paginationParams,
    {
      key: "shared",
      label: "Include shared",
      type: "number",
      hint: "1 to include contacts shared by other sub-accounts.",
    },
    ...orderingParams,
  ],
  output: [
    { key: "page", type: "number", label: "Current page" },
    { key: "pageCount", type: "number", label: "Total number of pages" },
    { key: "limit", type: "number", label: "Results per page" },
    { key: "resources", type: "array", label: "Contacts" },
  ],

  execute(input, ctx) {
    return new TextMagicClient(ctx).json<TmPage<unknown>>("/contacts", {
      query: compact({ ...input }),
    });
  },
};

export default contactList;
