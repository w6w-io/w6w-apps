import type { ActionDefinition } from "@w6w/types";
import { JustCallClient, toList } from "../lib/client.ts";
import { CONTACT_LISTS, ORDER_ASC_DESC, PAGE, PAGINATION_OUTPUT, perPage } from "../lib/params.ts";

/** `GET /v2.1/contacts` — verified against `contacts_list_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  across_team?: boolean;
  agent_ids?: string[] | string;
  contact_number?: string;
  first_name?: string;
  last_contact_id_fetched?: number;
  last_name?: string;
  order?: string;
  page?: number;
  per_page?: number;
  status?: string[] | string;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "search",
  resource: "contact",
  title: "List Contacts",
  description: "Retrieve contacts in the account, optionally filtered by name, number or status.",
  params: [
    {
      key: "across_team",
      label: "Across team",
      type: "boolean",
      hint: "true: contacts across all agents. false (default): only the account owner's.",
    },
    { key: "agent_ids", label: "Agent IDs", type: "string", hint: "Comma-separated." },
    { key: "contact_number", label: "Contact number", type: "string" },
    { key: "first_name", label: "First name", type: "string" },
    { key: "last_name", label: "Last name", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: CONTACT_LISTS.map((v) => ({ label: v, value: v })),
    },
    {
      key: "last_contact_id_fetched",
      label: "Last contact ID fetched",
      type: "number",
      hint: "Pair with next_page_link to avoid duplicate rows across pages.",
    },
    ORDER_ASC_DESC,
    PAGE,
    perPage(50, 500),
  ],
  output: PAGINATION_OUTPUT,

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    const { body } = await client.json("/contacts", {
      query: {
        across_team: input.across_team,
        agent_ids: toList(input.agent_ids),
        contact_number: input.contact_number,
        first_name: input.first_name,
        last_name: input.last_name,
        status: toList(input.status),
        last_contact_id_fetched: input.last_contact_id_fetched,
        order: input.order,
        page: input.page,
        per_page: input.per_page,
      },
    });
    return body;
  },
};

export default contactList;
