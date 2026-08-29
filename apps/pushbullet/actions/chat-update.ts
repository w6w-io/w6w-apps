import type { ActionDefinition } from "@w6w/types";
import { PushbulletClient } from "../lib/client.ts";

/** `POST /v2/chats/{iden}` — the only documented field is `muted`. */
interface Input {
  iden: string;
  muted: boolean;
}

const chatUpdate: ActionDefinition<Input> = {
  key: "chat-update",
  type: "perform",
  resource: "chat",
  title: "Update Chat",
  description: "Mute or unmute a chat.",
  idempotent: true,
  params: [
    { key: "iden", label: "Chat ID", type: "string", required: true },
    { key: "muted", label: "Muted", type: "boolean", required: true, default: true },
  ],
  output: [
    { key: "iden", type: "string", label: "Chat ID" },
    { key: "muted", type: "boolean", label: "Muted" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json(`/chats/${encodeURIComponent(input.iden)}`, {
      method: "POST",
      body: { muted: input.muted },
    });
  },
};

export default chatUpdate;
