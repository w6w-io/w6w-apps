import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, hostFromConnection, toList, WrikeClient } from "../lib/client.ts";
import {
  paginationParams,
  rawParamsParam,
  sortOrderOptions,
  taskImportanceOptions,
  taskSortFieldOptions,
  taskStatusOptions,
} from "../lib/params.ts";

/**
 * `GET /tasks` — search among every task in the account.
 *
 * **With no filter at all this returns the account's ENTIRE task list.**
 * Wrike's own `limit` and `pageSize` parameters both default to unbounded /
 * a large ceiling rather than a small one, which is the same "vendor list
 * defaults are enormous" trap this pack has already documented for Apify's
 * `GET /v2/store` (3.8 MB unfiltered). `pageSize` is therefore prefilled to a
 * modest 100 here; raise it explicitly when a genuinely large export is meant.
 *
 * `nextPageToken` recovery: see `lib/params.ts`'s `paginationParams` doc for
 * why the vendor's own docs never name the response header that carries it.
 * This action cannot return one because `WrikeClient` does not expose response
 * headers — pass a `nextPageToken` obtained some other way (e.g. Wrike's own
 * UI/Postman collection while debugging) to page manually if needed.
 */
interface Input {
  title?: string;
  status?: string[] | string;
  importance?: string;
  authors?: string[] | string;
  responsibles?: string[] | string;
  subTasks?: boolean;
  sortField?: string;
  sortOrder?: string;
  pageSize?: number;
  nextPageToken?: string;
  rawParams?: unknown;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "Search Tasks",
  description: "Search among all tasks in the current account.",
  params: [
    { key: "title", label: "Title contains", type: "string" },
    {
      key: "status",
      label: "Status",
      type: "multiselect",
      options: taskStatusOptions,
      hint: "Leave empty to match every status.",
    },
    { key: "importance", label: "Importance", type: "select", options: taskImportanceOptions },
    {
      key: "authors",
      label: "Author user IDs",
      type: "string",
      hint: "Comma-separated Wrike user IDs.",
    },
    {
      key: "responsibles",
      label: "Assignee user IDs",
      type: "string",
      hint: "Comma-separated Wrike user IDs.",
    },
    {
      key: "subTasks",
      label: "Include subtasks",
      type: "boolean",
      advanced: true,
    },
    {
      key: "sortField",
      label: "Sort field",
      type: "select",
      options: taskSortFieldOptions,
      advanced: true,
    },
    {
      key: "sortOrder",
      label: "Sort order",
      type: "select",
      options: sortOrderOptions,
      advanced: true,
    },
    ...paginationParams(100),
    rawParamsParam,
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
  ],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list("/tasks", {
      query: {
        title: input.title,
        status: toList(input.status),
        importance: input.importance,
        authors: toList(input.authors),
        responsibles: toList(input.responsibles),
        subTasks: input.subTasks,
        sortField: input.sortField,
        sortOrder: input.sortOrder,
        pageSize: input.pageSize,
        nextPageToken: input.nextPageToken,
        ...asOptionalJson<Record<string, unknown>>(input.rawParams, "Additional parameters"),
      },
    });
    return { items };
  },
};

export default taskList;
