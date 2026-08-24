import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import {
  fieldsParam,
  matterIdFilterParam,
  paginationParams,
  queryParam,
  refParam,
  taskPriorityOptions,
  taskStatusOptions,
} from "../lib/params.ts";

/** `GET /tasks.json` */
interface Input {
  matterId?: number;
  assigneeId?: number;
  assigneeType?: string;
  status?: string;
  priority?: string;
  complete?: boolean;
  query?: string;
  fields?: string;
  limit?: number;
  pageToken?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks, optionally filtered by matter, assignee, status or priority.",
  params: [
    matterIdFilterParam,
    refParam(
      "assigneeId",
      "Assignee (user or contact) ID",
      "Requires Assignee type below — Clio's own docs: \"must be passed if filtering by " +
        'assignee".',
    ),
    {
      key: "assigneeType",
      label: "Assignee type",
      type: "select",
      options: [{ value: "user", label: "User" }, { value: "contact", label: "Contact" }],
    },
    { key: "status", label: "Status", type: "select", options: taskStatusOptions },
    { key: "priority", label: "Priority", type: "select", options: taskPriorityOptions },
    { key: "complete", label: "Complete", type: "boolean" },
    { ...queryParam, hint: "Wildcard search across name and description." },
    fieldsParam(
      "id,etag,name,status,priority,due_at,complete,assignee{id,name},matter{id,display_number}",
    ),
    ...paginationParams(),
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "nextPageToken", type: "string", label: "Token for the next page, if any" },
  ],

  execute(input, ctx) {
    return new ClioClient(ctx).list("/tasks.json", {
      query: {
        matter_id: input.matterId,
        assignee_id: input.assigneeId,
        assignee_type: input.assigneeType,
        status: input.status,
        priority: input.priority,
        complete: input.complete,
        query: input.query,
        fields: input.fields,
        limit: input.limit,
        order: "id(asc)",
        page_token: input.pageToken,
      },
    });
  },
};

export default taskList;
