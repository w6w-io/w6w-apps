import type { ActionDefinition } from "@w6w/types";
import { PAGE_PARAMS, type PageInput, pageQuery, WealthboxClient } from "../lib/client.ts";

interface Input extends PageInput {
  resourceId?: number;
  resourceType?: string;
  assignedTo?: number;
  assignedToTeam?: number;
  createdBy?: number;
  completed?: boolean;
  taskType?: string;
  updatedSince?: string;
  updatedBefore?: string;
}

/** `GET /v1/tasks` — list/filter Tasks (including subtasks of parent tasks). */
const listTasks: ActionDefinition<Input> = {
  key: "list-tasks",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List/filter Tasks accessible to the authenticated user.",
  params: [
    { key: "resourceId", label: "Linked resource ID", type: "number" },
    {
      key: "resourceType",
      label: "Linked resource type",
      type: "string",
      hint: "e.g. Contact, Project, Opportunity.",
    },
    { key: "assignedTo", label: "Assigned to user ID", type: "number" },
    { key: "assignedToTeam", label: "Assigned to team ID", type: "number" },
    { key: "createdBy", label: "Created by user ID", type: "number" },
    { key: "completed", label: "Include completed", type: "boolean" },
    {
      key: "taskType",
      label: "Task type",
      type: "select",
      options: [
        { value: "all", label: "All" },
        { value: "parents", label: "Parents only" },
        { value: "subtasks", label: "Subtasks only" },
      ],
    },
    { key: "updatedSince", label: "Updated since", type: "string" },
    { key: "updatedBefore", label: "Updated before", type: "string" },
    ...PAGE_PARAMS,
  ],
  output: [{ key: "tasks", type: "array", label: "Tasks" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/tasks", {
      query: {
        resource_id: input.resourceId,
        resource_type: input.resourceType,
        assigned_to: input.assignedTo,
        assigned_to_team: input.assignedToTeam,
        created_by: input.createdBy,
        completed: input.completed,
        task_type: input.taskType,
        updated_since: input.updatedSince,
        updated_before: input.updatedBefore,
        ...pageQuery(input),
      },
    });
  },
};

export default listTasks;
