import type { ActionDefinition } from "@w6w/types";
import { MeisterTaskClient } from "../lib/client.ts";

/** `POST /tasks/:task_id/comments` — post a comment on a task. Supports Markdown. */
interface Input {
  taskId: number;
  text: string;
}

const commentCreate: ActionDefinition<Input> = {
  key: "comment-create",
  type: "perform",
  resource: "comment",
  title: "Create Comment",
  description: "Post a comment on a task. The text field supports Markdown.",
  idempotent: false,
  params: [
    { key: "taskId", label: "Task ID", type: "number", required: true },
    {
      key: "text",
      label: "Comment text",
      type: "text",
      required: true,
      hint: "Supports Markdown.",
    },
  ],
  output: [
    { key: "id", type: "number", label: "Comment ID" },
    { key: "text", type: "string", label: "Comment text" },
    { key: "text_html", type: "string", label: "Rendered HTML" },
    { key: "person_id", type: "number", label: "Author person ID" },
  ],

  execute(input, ctx) {
    return new MeisterTaskClient(ctx).request(`/tasks/${input.taskId}/comments`, {
      method: "POST",
      body: { text: input.text },
    });
  },
};

export default commentCreate;
