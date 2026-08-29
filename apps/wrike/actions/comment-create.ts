import type { ActionDefinition } from "@w6w/types";
import { hostFromConnection, WrikeClient } from "../lib/client.ts";
import { taskIdParam } from "../lib/params.ts";

/**
 * `POST /tasks/{taskId}/comments` — post a comment to a task.
 *
 * Not idempotent: Wrike documents no idempotency key, so a retry posts a
 * second, duplicate comment.
 */
interface Input {
  taskId: string;
  text: string;
  plainText?: boolean;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on a task.",
  idempotent: false,
  params: [
    taskIdParam,
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "plainText",
      label: "Plain text",
      type: "boolean",
      advanced: true,
      hint: "Interpret `text` as plain text rather than HTML.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "text", type: "string", label: "Text" },
    { key: "createdDate", type: "string", label: "Created date" },
  ],

  execute(input, ctx) {
    const host = hostFromConnection(ctx.connection);
    ctx.log("info", "posting Wrike comment", { taskId: input.taskId });
    return new WrikeClient(ctx, host).one(
      `/tasks/${encodeURIComponent(input.taskId)}/comments`,
      { method: "POST", query: { text: input.text, plainText: input.plainText } },
    );
  },
};

export default commentCreate;
