import type { ActionDefinition } from "@w6w/types";
import { ClickSendClient, type ClickSendPage, compact } from "../lib/client.ts";

interface Input {
  page?: number;
  limit?: number;
}

export interface ContactListRow {
  list_id?: number;
  list_name?: string;
  list_email_id?: string;
  _contacts_count?: number;
}

/** `GET /lists` — list Contact Lists for this account. */
const contactListList: ActionDefinition<Input> = {
  key: "contact-list-list",
  type: "read",
  resource: "contact-list",
  title: "List Contact Lists",
  description: "List Contact Lists (GET /lists).",
  params: [
    { key: "page", label: "Page", type: "number", default: 1 },
    { key: "limit", label: "Limit", type: "number", default: 15, hint: "Min 15, max 100." },
  ],
  output: [
    { key: "lists", type: "array", label: "Contact Lists" },
    { key: "total", type: "number", label: "Total lists" },
  ],

  async execute(input, ctx) {
    const client = new ClickSendClient(ctx);
    const page = await client.data<ClickSendPage<ContactListRow>>("/lists", {
      query: compact({ page: input.page, limit: input.limit }),
    });
    return { lists: page.data ?? [], total: page.total };
  },
};

export default contactListList;
