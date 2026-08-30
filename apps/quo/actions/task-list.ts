import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";
import { maxResultsParam, pageTokenParam, paginationOutputFields } from "../lib/params.ts";

/** `GET /v1/tasks` — paginated list of tasks. Quo exposes no filter query params here. */
interface Input {
  maxResults?: number;
  pageToken?: string;
}

const taskList: ActionDefinition<Input> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "Retrieve a paginated list of tasks.",
  params: [maxResultsParam(), pageTokenParam],
  output: [
    {
      key: "data",
      type: "array",
      label: "Tasks (taskId, title, description, dueDate, assignedTo, assignedBy, " +
        "phoneNumberId, conversationId, activityId, phoneNumberGroupId, orgId, createdAt, " +
        "createdBy, completed, isDeleted, revision)",
    },
    ...paginationOutputFields,
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json("/tasks", {
      query: { maxResults: input.maxResults, pageToken: input.pageToken },
    });
  },
};

export default taskList;
