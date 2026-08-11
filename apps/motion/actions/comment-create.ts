import type { ActionDefinition } from "@w6w/types";
import { MotionClient, omitUndefined, V1 } from "../lib/client.ts";

/**
 * `POST /v1/comments` — comment on a task.
 *
 * `content` is Markdown going in and comes back as HTML: the create reference
 * says "Github Flavored Markdown representing the comment", while the list
 * reference calls the same field "The HTML content of the comment". Motion
 * converts on write.
 *
 * The reference marks `content` **optional**, which is surprising for a comment
 * and is preserved here rather than tightened — the pack's rule is to declare
 * what the vendor documents, and an empty comment failing server-side is a
 * clearer signal than a form rule this app invented.
 *
 * Not idempotent: no idempotency key exists anywhere in this API, so a retry
 * posts a second comment.
 */
interface Input {
  taskId: string;
  content?: string;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on a task.",
  idempotent: false,
  params: [
    {
      key: "taskId",
      label: "Task ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Tasks or Create Task result.",
    },
    {
      key: "content",
      label: "Comment",
      type: "text",
      hint: "GitHub Flavored Markdown; Motion stores it as HTML. Marked optional by Motion's own " +
        "reference, which is why it is not required here.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Comment ID" },
    { key: "taskId", type: "string", label: "Task ID" },
    { key: "content", type: "string", label: "Comment content (HTML)" },
  ],

  execute(input, ctx) {
    ctx.log("info", "commenting on Motion task", { taskId: input.taskId });
    return new MotionClient(ctx).json(`${V1}/comments`, {
      method: "POST",
      body: omitUndefined({ taskId: input.taskId, content: input.content }),
    });
  },
};

export default commentCreate;
