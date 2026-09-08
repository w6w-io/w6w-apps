import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  userId: string;
  reason?: string;
}

interface Output {
  unbanned: boolean;
}

/**
 * `POST /_matrix/client/v3/rooms/{roomId}/unban`. Idempotent: unbanning an
 * already-unbanned (or never-banned) user is the same successful `{}`
 * response.
 */
const unbanUser: ActionDefinition<Input, Output> = {
  key: "unban-user",
  type: "perform",
  title: "Unban User",
  description: "Unban a user from a room so they can be invited to or join it again.",
  idempotent: true,
  params: [
    {
      key: "roomId",
      label: "Room ID",
      type: "string",
      required: true,
      placeholder: "!abcdefg:matrix.org",
    },
    {
      key: "userId",
      label: "User ID",
      type: "string",
      required: true,
      placeholder: "@bob:matrix.org",
    },
    { key: "reason", label: "Reason", type: "string" },
  ],
  output: [{ key: "unbanned", type: "boolean", label: "Unbanned" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    await client.request(`/rooms/${seg(input.roomId)}/unban`, {
      method: "POST",
      body: compact({ user_id: input.userId, reason: input.reason }),
    });
    return { unbanned: true };
  },
};

export default unbanUser;
