import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/link-conversation` — link a task to a conversation. */
interface Input {
  taskId: string;
  conversationId: string;
}

const taskLinkConversation: ActionDefinition<Input> = {
  key: "task-link-conversation",
  type: "perform",
  resource: "task",
  title: "Link Task To Conversation",
  description: "Link a task to a conversation.",
  idempotent: true,
  params: [
    { key: "taskId", label: "Task ID", type: "string", required: true, placeholder: "TK123abc" },
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      required: true,
      placeholder: "CN123abc",
    },
  ],
  output: [
    { key: "data", type: "object", label: "Task (taskId, revision)" },
  ],

  execute(input, ctx) {
    return new QuoClient(ctx).json(`/tasks/${encodeURIComponent(input.taskId)}/link-conversation`, {
      method: "POST",
      body: { conversationId: input.conversationId },
    });
  },
};

export default taskLinkConversation;
