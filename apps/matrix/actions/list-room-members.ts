import type { ActionDefinition } from "@w6w/types";
import { MatrixClient, seg } from "../lib/client.ts";

interface Input {
  roomId: string;
}

interface RoomMember {
  userId: string;
  displayName?: string;
  avatarUrl?: string;
}

interface Output {
  members: RoomMember[];
}

/**
 * `GET /_matrix/client/v3/rooms/{roomId}/joined_members` — chosen over
 * `GET /rooms/{roomId}/members` (which returns raw `m.room.member` state
 * events, one per historical membership change) because the spec says
 * `joined_members` "should be faster to respond" and it already answers the
 * question this action is for: who is in the room right now, by user id, with
 * display name and avatar. The response's `joined` map is flattened into a
 * list here so each member carries its own `userId`.
 */
const listRoomMembers: ActionDefinition<Input, Output> = {
  key: "list-room-members",
  type: "read",
  title: "List Room Members",
  description: "List the current members of a room.",
  params: [
    {
      key: "roomId",
      label: "Room ID",
      type: "string",
      required: true,
      placeholder: "!abcdefg:matrix.org",
    },
  ],
  output: [{ key: "members", type: "array", label: "Members" }],

  async execute(input, ctx) {
    const client = new MatrixClient(ctx);
    const res = await client.request<
      { joined?: Record<string, { display_name?: string; avatar_url?: string }> }
    >(`/rooms/${seg(input.roomId)}/joined_members`);
    const joined = res.joined ?? {};
    const members = Object.entries(joined).map(([userId, m]) => ({
      userId,
      displayName: m.display_name,
      avatarUrl: m.avatar_url,
    }));
    return { members };
  },
};

export default listRoomMembers;
