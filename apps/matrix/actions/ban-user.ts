import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  userId: string;
  reason?: string;
}

interface Output {
  banned: boolean;
}

/**
 * `POST /_matrix/client/v3/rooms/{roomId}/ban`. Per the spec: "If the user is
 * currently in the room, also kick them" — one call handles both a joined
 * member and someone merely invited. Idempotent: banning an already-banned
 * user is the same successful `{}` response.
 */
const banUser: ActionDefinition<Input, Output> = {
  key: "ban-user",
  type: "perform",
  title: "Ban User",
  description: "Ban a user from a room, kicking them first if they are currently in it.",
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
  output: [{ key: "banned", type: "boolean", label: "Banned" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    await client.request(`/rooms/${seg(input.roomId)}/ban`, {
      method: "POST",
      body: compact({ user_id: input.userId, reason: input.reason }),
    });
    return { banned: true };
  },
};

export default banUser;
