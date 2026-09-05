import type { ActionDefinition } from "@w6w/types";
import {
  compact,
  ManusClient,
  type SearchResult,
  type Task,
  type TaskListResponse,
  toSearchResult,
} from "../lib/client.ts";
import { cursorParams, orderOptions, taskScopeOptions } from "../lib/params.ts";

/**
 * `GET /v2/task.list` — every task, filterable and cursor-paginated. Set
 * Scope to "Agent subtask" with an Agent ID to view one custom agent's
 * subtasks, or to "Project" with a Project ID to view one project's tasks.
 */
interface Input {
  cursor?: string;
  limit?: number;
  order?: string;
  scope?: string;
  agentId?: string;
  projectId?: string;
  oauthClientId?: string;
  apiKeyId?: string;
}

const taskList: ActionDefinition<Input, SearchResult<Task>> = {
  key: "task-list",
  type: "search",
  resource: "task",
  title: "List Tasks",
  description: "List tasks, optionally filtered by scope, agent, project or creator.",
  params: [
    ...cursorParams(20, 100),
    { key: "order", label: "Order", type: "select", options: orderOptions, default: "desc" },
    { key: "scope", label: "Scope", type: "select", options: taskScopeOptions, default: "all" },
    {
      key: "agentId",
      label: "Agent ID",
      type: "string",
      advanced: true,
      hint: 'Required when Scope is "Agent subtask". Supports the shortcut `agent-default`.',
    },
    {
      key: "projectId",
      label: "Project ID",
      type: "string",
      advanced: true,
      hint: 'Required when Scope is "Project".',
    },
    {
      key: "oauthClientId",
      label: "OAuth client ID",
      type: "string",
      advanced: true,
      hint: "Filter to tasks created by one Open App. Mutually exclusive with API Key ID.",
    },
    {
      key: "apiKeyId",
      label: "API key ID",
      type: "string",
      advanced: true,
      hint: "Filter to tasks created by one API key. Mutually exclusive with OAuth client ID.",
    },
  ],
  output: [
    { key: "items", type: "array", label: "Tasks" },
    { key: "nextCursor", type: "string", label: "Pass into Cursor for the next page" },
  ],

  async execute(input, ctx) {
    const res = await new ManusClient(ctx).request<TaskListResponse>("/v2/task.list", {
      query: compact({
        cursor: input.cursor,
        limit: input.limit,
        order: input.order,
        scope: input.scope,
        agent_id: input.agentId,
        project_id: input.projectId,
        oauth_client_id: input.oauthClientId,
        api_key_id: input.apiKeyId,
      }),
    });
    return toSearchResult(res.data, res.has_more, res.next_cursor);
  },
};

export default taskList;
