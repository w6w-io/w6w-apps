import type { ActionDefinition } from "@w6w/types";
import { MatrixClient } from "../lib/client.ts";

// deno-lint-ignore no-empty-interface
interface Input {}

interface Output {
  roomIds: string[];
}

/** `GET /_matrix/client/v3/joined_rooms` — every room the account currently has joined. */
const listJoinedRooms: ActionDefinition<Input, Output> = {
  key: "list-joined-rooms",
  type: "read",
  title: "List Joined Rooms",
  description: "List the room IDs the connected account is currently a member of.",
  params: [],
  output: [{ key: "roomIds", type: "array", label: "Room IDs" }],

  async execute(_input, ctx) {
    const client = new MatrixClient(ctx);
    const res = await client.request<{ joined_rooms?: string[] }>("/joined_rooms");
    return { roomIds: res.joined_rooms ?? [] };
  },
};

export default listJoinedRooms;
