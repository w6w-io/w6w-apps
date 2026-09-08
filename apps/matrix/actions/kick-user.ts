import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  userId: string;
  reason?: string;
}

interface Output {
  kicked: boolean;
}

/**
 * `POST /_matrix/client/v3/rooms/{roomId}/kick` — sets the target's membership
 * to `leave`. Unlike ban/unban, retrying after the user has already left
 * fails with `M_FORBIDDEN` ("the kickee is not currently in the room") rather
 * than succeeding quietly a second time — but that failure changes nothing,
 * so a retry remains safe even though it may report an error the second time.
 */
const kickUser: ActionDefinition<Input, Output> = {
  key: "kick-user",
  type: "perform",
  title: "Kick User",
  description: "Remove a user from a room. They may rejoin unless also banned.",
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
  output: [{ key: "kicked", type: "boolean", label: "Kicked" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    await client.request(`/rooms/${seg(input.roomId)}/kick`, {
      method: "POST",
      body: compact({ user_id: input.userId, reason: input.reason }),
    });
    return { kicked: true };
  },
};

export default kickUser;
