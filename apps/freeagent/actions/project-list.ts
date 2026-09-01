import type { ActionDefinition } from "@w6w/types";
import { FreeAgentClient, ref } from "../lib/client.ts";
import { page, perPage } from "../lib/params.ts";

interface Input {
  view?: "active" | "completed" | "cancelled" | "hidden";
  contactId?: string;
  sort?: "name" | "contact_name" | "contact_display_name" | "created_at" | "updated_at";
  nested?: boolean;
  page?: number;
  perPage?: number;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "read",
  resource: "project",
  title: "List Projects",
  description: "List projects, optionally scoped to a contact.",
  params: [
    {
      key: "view",
      label: "View",
      type: "select",
      advanced: true,
      options: [
        { value: "active", label: "Active" },
        { value: "completed", label: "Completed" },
        { value: "cancelled", label: "Cancelled" },
        { value: "hidden", label: "Hidden" },
      ],
    },
    { key: "contactId", label: "Contact ID", type: "string", advanced: true },
    {
      key: "sort",
      label: "Sort by",
      type: "select",
      advanced: true,
      options: [
        { value: "name", label: "Name (default)" },
        { value: "contact_name", label: "Contact name" },
        { value: "contact_display_name", label: "Contact display name" },
        { value: "created_at", label: "Created at" },
        { value: "updated_at", label: "Updated at" },
      ],
    },
    {
      key: "nested",
      label: "Nested contact",
      type: "boolean",
      advanced: true,
      hint: "Return the full contact object per project instead of a URL reference.",
    },
    page,
    perPage,
  ],
  output: [{ key: "projects", type: "array", label: "Projects" }],

  execute(input, ctx) {
    return new FreeAgentClient(ctx).request("/projects", {
      query: {
        view: input.view,
        contact: input.contactId ? ref("contacts", input.contactId) : undefined,
        sort: input.sort,
        nested: input.nested,
        page: input.page,
        per_page: input.perPage,
      },
    });
  },
};

export default projectList;
