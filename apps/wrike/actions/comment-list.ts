import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `GET /tasks/{taskId}/comments` — a task's comments.
 *
 * Wrike also exposes account-wide (`GET /comments`) and folder-scoped
 * (`GET /folders/{folderId}/comments`) comment listings; this app covers the
 * task-scoped one, the most common case for a workflow reacting to task
 * activity. `comment-get` covers reading specific comments by ID regardless
 * of which parent they belong to.
 */
interface Input {
  taskId: string;
  plainText?: boolean;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Task Comments",
  description: "List all comments on a task.",
  params: [
    taskIdParam,
    {
      key: "plainText",
      label: "Plain text",
      type: "boolean",
      hint: "Strip HTML formatting from comment text.",
    },
  ],
  output: [{ key: "items", type: "array", label: "Comments" }],

  async execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    const items = await new WrikeClient(ctx, host).list(
      `/tasks/${encodeURIComponent(input.taskId)}/comments`,
      { query: { plainText: input.plainText } },
    );
    return { items };
  },
};

export default commentList;
