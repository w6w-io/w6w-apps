import type { ActionDefinition } from "@w6w/types";
import { MotionClient, V1 } from "../lib/client.ts";
import { cursorParam, pageOutput } from "../lib/params.ts";

/**
 * `GET /v1/comments` — every comment on one task.
 *
 * `taskId` is required: there is no "all comments in a workspace" form, and no
 * comment endpoint for projects at all. Comments are read and written as
 * **HTML** on the way out (`content` is documented as "The HTML content of the
 * comment") and as Markdown on the way in — see `comment-create`.
 */
interface Input {
  taskId: string;
  cursor?: string;
}

const commentList: ActionDefinition<Input> = {
  key: "comment-list",
  type: "search",
  resource: "comment",
  title: "List Comments",
  description: "List the comments on a task.",
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "Required — Motion has no endpoint for listing comments across tasks.",
    },
    cursorParam,
  ],
  output: [
    {
      key: "items",
      type: "array",
      label: "Comments — each { id, taskId, content (HTML), creator }",
    },
    ...pageOutput,
  ],

  execute(input, ctx) {
    return new MotionClient(ctx).page(`${V1}/comments`, "comments", {
      query: { taskId: input.taskId, cursor: input.cursor },
    });
  },
};

export default commentList;
