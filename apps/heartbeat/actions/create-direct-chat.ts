import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/**
 * `PUT /v0/directChats` — get-or-create a direct chat between two users.
 *
 * Heartbeat documents this explicitly as idempotent: "If one already exists,
 * then nothing will be created and the existing chat id & URL will be
 * returned."
 */
interface Input {
  userID1: string;
  userID2: string;
}

const createDirectChat: ActionDefinition<Input> = {
  key: "create-direct-chat",
  type: "perform",
  resource: "direct-chat",
  title: "Get or Create Direct Chat",
  description:
    "Create a direct chat between two users. If one already exists, its id & URL are returned " +
    "instead of creating a duplicate.",
  idempotent: true,
  params: [
    { key: "userID1", label: "User ID 1", type: "string", required: true },
    { key: "userID2", label: "User ID 2", type: "string", required: true },
  ],
  output: [
    { key: "chatID", type: "string", label: "Direct chat ID" },
    { key: "url", type: "string", label: "URL to this direct chat" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/directChats", {
      method: "PUT",
      body: { userID1: input.userID1, userID2: input.userID2 },
    });
  },
};

export default createDirectChat;
