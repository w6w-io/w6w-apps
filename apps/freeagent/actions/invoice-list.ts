import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, ref } from "../lib/client.ts";
import { page, perPage, updatedSince } from "../lib/params.ts";

interface Input {
  view?: "all" | "recent_open_or_overdue" | "open" | "overdue" | "paid" | "draft" | "scheduled";
  contactId?: string;
  projectId?: string;
  updatedSince?: string;
  sort?: "dated_on" | "created_at" | "updated_at";
  page?: number;
  perPage?: number;
}

const invoiceList: ActionDefinition<Input> = {
  key: "invoice-list",
  type: "read",
  resource: "invoice",
  title: "List Invoices",
  description: "List invoices, optionally filtered by contact or project.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "all", label: "All (default)" },
        { value: "recent_open_or_overdue", label: "Recent, open or overdue" },
        { value: "open", label: "Open" },
        { value: "overdue", label: "Overdue" },
        { value: "paid", label: "Paid" },
        { value: "draft", label: "Draft" },
        { value: "scheduled", label: "Scheduled" },
      ],
    },
    { key: "contactId", label: "Contact ID", type: "string", advanced: true },
    { key: "projectId", label: "Project ID", type: "string", advanced: true },
    updatedSince,
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "dated_on", label: "Invoice date (default)" },
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    page,
    perPage,
  ],
  output: [{ key: "invoices", type: "array", label: "Invoices" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/invoices", {
      query: {
        view: input.view,
        contact: input.contactId ? ref("contacts", input.contactId) : undefined,
        project: input.projectId ? ref("projects", input.projectId) : undefined,
        updated_since: input.updatedSince,
        sort: input.sort,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default invoiceList;
