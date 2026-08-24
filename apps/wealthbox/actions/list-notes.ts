import type { ActionDefinition } from "@w6w/types";
import { PAGE_PARAMS, type PageInput, pageQuery, WealthboxClient } from "../lib/client.ts";

interface Input extends PageInput {
  resourceId?: number;
  resourceType?: string;
  order?: string;
  updatedSince?: string;
  updatedBefore?: string;
}

/**
 * `GET /v1/notes` — list/filter Notes.
 *
 * The response envelope key is `status_updates`, not `notes` — Wealthbox's own
 * docs state it plainly: "Notes are returned in the `status_updates` array."
 */
const listNotes: ActionDefinition<Input> = {
  key: "list-notes",
  type: "search",
  resource: "note",
  title: "List Notes",
  description: "List/filter Notes accessible to the authenticated user.",
  params: [
    { key: "resourceId", label: "Linked resource ID", type: "number" },
    { key: "resourceType", label: "Linked resource type", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending by created date (default)" },
        { value: "created", label: "Descending by created date" },
        { value: "updated", label: "Descending by updated date" },
      ],
    },
    { key: "updatedSince", label: "Updated since", type: "string" },
    { key: "updatedBefore", label: "Updated before", type: "string" },
    ...PAGE_PARAMS,
  ],
  output: [{ key: "status_updates", type: "array", label: "Notes" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/notes", {
      query: {
        resource_id: input.resourceId,
        resource_type: input.resourceType,
        order: input.order,
        updated_since: input.updatedSince,
        updated_before: input.updatedBefore,
        ...pageQuery(input),
      },
    });
  },
};

export default listNotes;
