import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient } from "../lib/client.ts";
import { page, perPage, updatedSince } from "../lib/params.ts";

interface Input {
  view?: "all" | "active" | "clients" | "suppliers" | "hidden";
  sort?: "name" | "created_at" | "updated_at";
  updatedSince?: string;
  page?: number;
  perPage?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List contacts (customers and suppliers).",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      default: "active",
      options: [
        { value: "all", label: "All" },
        { value: "active", label: "Active (default)" },
        { value: "clients", label: "Clients" },
        { value: "suppliers", label: "Suppliers" },
        { value: "hidden", label: "Hidden" },
      ],
    },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "name", label: "Name (default)" },
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    updatedSince,
    page,
    perPage,
  ],
  output: [{ key: "contacts", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/contacts", {
      query: {
        view: input.view,
        sort: input.sort,
        updated_since: input.updatedSince,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default contactList;
