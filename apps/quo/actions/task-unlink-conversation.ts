import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/** `POST /v1/tasks/{taskId}/unlink-conversation` — unlink a conversation from a task. */
interface Input {
  taskId: string;
  conversationId: string;
}

const taskUnlinkConversation: ActionDefinition<Input> = {
  key: "task-unlink-conversation",
  type: "perform",
  resource: "task",
  title: "Unlink Task From Conversation",
  description: "Unlink a conversation from a task.",
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
    return new QuoClient(ctx).json(
      `/tasks/${encodeURIComponent(input.taskId)}/unlink-conversation`,
      {
        method: "POST",
        body: { conversationId: input.conversationId },
      },
    );
  },
};

export default taskUnlinkConversation;
