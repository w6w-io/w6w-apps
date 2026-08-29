import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/chats` — get-or-create. The vendor's own description: "Create a
 * chat with another user or email address if one does not already exist."
 * That is an explicit get-or-create contract, so calling this twice with the
 * same email is safe.
 */
interface Input {
  email: string;
}

const chatCreate: ActionDefinition<Input> = {
  key: "chat-create",
  type: "perform",
  resource: "chat",
  title: "Create Chat",
  description: "Create a chat with another user or email address, or return the existing one.",
  idempotent: true,
  params: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      hint: "Does not have to belong to an existing Pushbullet user.",
    },
  ],
  output: [
    { key: "iden", type: "string", label: "Chat ID" },
    { key: "with", type: "object", label: "The person this chat is with" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json("/chats", {
      method: "POST",
      body: { email: input.email },
    });
  },
};

export default chatCreate;
