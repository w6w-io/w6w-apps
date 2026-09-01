import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { idsParam, paginationParams, sortByParam } from "../lib/params.ts";

/**
 * `GET /v2/tasks` — "If you ask for tasks without any parameter provided Sell
 * API will return you both floating and related tasks." `type` narrows to one.
 */
interface Input {
  page?: number;
  perPage?: number;
  sortBy?: string;
  ids?: string;
  ownerId?: number;
  type?: string;
  resourceType?: string;
  resourceId?: number;
  completed?: boolean;
  overdue?: boolean;
  q?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "read",
  resource: "task",
  title: "List Tasks",
  description:
    "List tasks, optionally filtered. Returns both floating and related tasks unless narrowed.",
  params: [
    ...paginationParams(),
    sortByParam(["resource_type", "completed_at", "due_date", "created_at", "updated_at"]),
    idsParam,
    { key: "ownerId", label: "Owner user ID", type: "number" },
    {
      key: "type",
      label: "Task kind",
      type: "select",
      options: [
        { value: "floating", label: "Floating (not attached)" },
        { value: "related", label: "Related to a lead/contact/deal" },
      ],
    },
    {
      key: "resourceType",
      label: "Attached to",
      type: "select",
      options: [
        { value: "lead", label: "Lead" },
        { value: "contact", label: "Contact" },
        { value: "deal", label: "Deal" },
      ],
    },
    { key: "resourceId", label: "Resource ID", type: "number" },
    { key: "completed", label: "Completed only / incomplete only", type: "boolean" },
    { key: "overdue", label: "Overdue only / not overdue only", type: "boolean" },
    { key: "q", label: "Search content", type: "string", hint: "Full-text search on content." },
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const result = await new SellClient(ctx).list(
      "/tasks",
      compact({
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        ids: input.ids,
        owner_id: input.ownerId,
        type: input.type,
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        completed: input.completed,
        overdue: input.overdue,
        q: input.q,
      }),
    );
    return { items: result.items, count: result.count };
  },
};

export default taskList;
