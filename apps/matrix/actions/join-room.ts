import type { ActionDefinition } from "@w6w/types";
import { compact, MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomIdOrAlias: string;
  reason?: string;
}

interface Output {
  roomId: string;
}

/**
 * `POST /_matrix/client/v3/join/{roomIdOrAlias}` — chosen over
 * `POST /rooms/{roomId}/join` because it "takes either a room ID or alias",
 * per the spec, so this one action covers joining by `!roomId:server` or by a
 * human-typed `#alias:server`.
 *
 * Idempotent: the 200 response is "The room has been joined" whether this
 * call is what joined it or the account was already a member — the spec
 * states the joined room id is always returned in `room_id`, so a retry after
 * a dropped response is safe.
 */
const joinRoom: ActionDefinition<Input, Output> = {
  key: "join-room",
  type: "perform",
  title: "Join Room",
  description: "Join a room by room ID or alias.",
  idempotent: true,
  params: [
    {
      key: "roomIdOrAlias",
      label: "Room ID or Alias",
      type: "string",
      required: true,
      placeholder: "!abcdefg:matrix.org or #room:matrix.org",
    },
    { key: "reason", label: "Reason", type: "string", advanced: true },
  ],
  output: [{ key: "roomId", type: "string", label: "Room ID" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const res = await client.request<{ room_id: string }>(`/join/${seg(input.roomIdOrAlias)}`, {
      method: "POST",
      body: compact({ reason: input.reason }),
    });
    return { roomId: res.room_id };
  },
};

export default joinRoom;
