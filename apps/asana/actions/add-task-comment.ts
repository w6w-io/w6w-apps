import type { ActionDefinition } from "@w6w/types";
import { AsanaClient } from "../lib/client.ts";

interface Input {
  id: string;
  text: string;
  isTextHtml?: boolean;
  is_pinned?: boolean;
}

const addTaskComment: ActionDefinition<Input> = {
  key: "add-task-comment",
  type: "perform",
  resource: "task-comment",
  title: "Add Task Comment",
  description:
    "Post a comment (story) to a task. Toggle `isTextHtml` to send the body as HTML.",
  params: [
    { key: "id", label: "Task ID", type: "string", required: true },
    { key: "text", label: "Text", type: "text", required: true },
    {
      key: "isTextHtml",
      label: "Is Text HTML",
      type: "boolean",
      default: false,
      hint: "When true, the text is sent as `html_text` instead of `text`.",
    },
    { key: "is_pinned", label: "Pinned", type: "boolean" },
  ],

  async execute(input, ctx) {
    const body: Record<string, unknown> = {};
    if (input.isTextHtml) body.html_text = input.text;
    else body.text = input.text;
    if (input.is_pinned !== undefined) body.is_pinned = input.is_pinned;
    return new AsanaClient(ctx).request(`/tasks/${input.id}/stories`, {
      method: "POST",
      body,
    });
  },
};

export default addTaskComment;
