import type { ActionDefinition } from "@w6w/types";
import { QuoClient } from "../lib/client.ts";

/**
 * `POST /v1/tasks` — create a task linked to a phone number, a conversation, or a conversation
 * activity. Quo requires **exactly one** of `phoneNumberId`/`conversationId`/`activityId` — the
 * OpenAPI document models this as three separate required-field variants, not one object with
 * three optional links, so this action validates it client-side before the call rather than
 * letting the API reject an ambiguous or empty request.
 */
interface Input {
  title: string;
  description: string;
  dueDate?: string;
  assignedTo?: string;
  phoneNumberId?: string;
  conversationId?: string;
  activityId?: string;
}

const taskCreate: ActionDefinition<Input> = {
  key: "task-create",
  type: "perform",
  resource: "task",
  title: "Create Task",
  description: "Create a task linked to a phone number, conversation, or conversation " +
    "activity. Provide exactly one of Phone Number ID, Conversation ID or Activity ID.",
  idempotent: false,
  params: [
    { key: "title", label: "Title", type: "string", required: true },
    { key: "description", label: "Description", type: "text", required: true },
    { key: "dueDate", label: "Due date", type: "datetime" },
    { key: "assignedTo", label: "Assign to user ID", type: "string", placeholder: "US123abc" },
    {
      key: "phoneNumberId",
      label: "Phone number ID",
      type: "string",
      placeholder: "PN123abc",
      row: "link",
      hint: "Link to a phone number. Provide exactly one of these three link fields.",
    },
    {
      key: "conversationId",
      label: "Conversation ID",
      type: "string",
      placeholder: "CN123abc",
      row: "link",
      hint: "Link to a conversation. Provide exactly one of these three link fields.",
    },
    {
      key: "activityId",
      label: "Activity ID",
      type: "string",
      placeholder: "AC123abc",
      row: "link",
      hint: "Link to a conversation activity. Provide exactly one of these three link fields.",
    },
  ],
  output: [
    {
      key: "data",
      type: "object",
      label: "Task (taskId, revision, phoneNumberId, conversationId, activityId)",
    },
  ],

  execute(input, ctx) {
    const links = [input.phoneNumberId, input.conversationId, input.activityId].filter(Boolean);
    if (links.length !== 1) {
      throw new Error(
        "task-create requires exactly one of phoneNumberId, conversationId or activityId — " +
          `got ${links.length}`,
      );
    }
    return new QuoClient(ctx).json("/tasks", {
      method: "POST",
      body: {
        title: input.title,
        description: input.description,
        dueDate: input.dueDate,
        assignedTo: input.assignedTo,
        phoneNumberId: input.phoneNumberId,
        conversationId: input.conversationId,
        activityId: input.activityId,
      },
    });
  },
};

export default taskCreate;
