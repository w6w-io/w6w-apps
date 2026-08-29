import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/** `GET /api/v2/rooms/{id}` — get one room by id. */
interface Input {
  roomId: string;
}

const roomsGet: ActionDefinition<Input> = {
  key: "rooms-get",
  type: "read",
  resource: "room",
  title: "Get Room",
  description: "Get a room by id.",
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "state", type: "string", label: "State" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/rooms/${encodeId(input.roomId)}`);
  },
};

export default roomsGet;
