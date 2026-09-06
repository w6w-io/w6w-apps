import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
  userId: string;
  reason?: string;
}

interface Output {
  invited: boolean;
}

/**
 * `POST /_matrix/client/v3/rooms/{roomId}/invite` — the Matrix-identifier
 * form (the spec's third-party-identifier invite is a separate, unimplemented
 * endpoint; see the README).
 *
 * Idempotent: the spec's own 200 description is "The user has been invited to
 * join the room, **or was already invited to the room**" — a retry after a
 * dropped response cannot double-invite anyone.
 */
const inviteUser: ActionDefinition<Input, Output> = {
  key: "invite-user",
  type: "perform",
  title: "Invite User",
  description: "Invite a user to a room by their Matrix ID.",
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
    { key: "reason", label: "Reason", type: "string", advanced: true },
  ],
  output: [{ key: "invited", type: "boolean", label: "Invited" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    await client.request(`/rooms/${seg(input.roomId)}/invite`, {
      method: "POST",
      body: compact({ user_id: input.userId, reason: input.reason }),
    });
    return { invited: true };
  },
};

export default inviteUser;
