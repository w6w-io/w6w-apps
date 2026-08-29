import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/** `DELETE /v2/chats/{iden}`. */
interface Input {
  iden: string;
}

const chatDelete: ActionDefinition<Input> = {
  key: "chat-delete",
  type: "perform",
  resource: "chat",
  title: "Delete Chat",
  description: "Delete a chat.",
  idempotent: true,
  params: [{ key: "iden", label: "Chat ID", type: "string", required: true }],
  output: [{ key: "deleted", type: "boolean", label: "Deleted" }],

  async execute(input, ctx) {
    const status = await new PushbulletClient(ctx).status(
      `/chats/${encodeURIComponent(input.iden)}`,
      { method: "DELETE" },
    );
    return { deleted: status === 200 };
  },
};

export default chatDelete;
