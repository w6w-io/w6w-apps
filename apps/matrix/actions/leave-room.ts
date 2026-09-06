import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  reason?: string;
}

interface Output {
  left: boolean;
}

/**
 * `POST /_matrix/client/v3/rooms/{roomId}/leave`. Also serves to reject a
 * pending invite, per the spec: "If the user was invited to the room, but had
 * not joined, this call serves to reject the invite."
 *
 * Idempotent: leaving a room already left, or rejecting an invite already
 * rejected, is the same successful `{}` response — there is nothing left to
 * duplicate on a retry.
 */
const leaveRoom: ActionDefinition<Input, Output> = {
  key: "leave-room",
  type: "perform",
  title: "Leave Room",
  description: "Leave a room, or reject a pending invite to it.",
  idempotent: true,
  params: [
    {
      key: "roomId",
      label: "Room ID",
      type: "string",
      required: true,
      placeholder: "!abcdefg:matrix.org",
    },
    { key: "reason", label: "Reason", type: "string", advanced: true },
  ],
  output: [{ key: "left", type: "boolean", label: "Left" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    await client.request(`/rooms/${seg(input.roomId)}/leave`, {
      method: "POST",
      body: compact({ reason: input.reason }),
    });
    return { left: true };
  },
};

export default leaveRoom;
