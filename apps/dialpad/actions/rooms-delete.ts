import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";

/**
 * `DELETE /api/v2/rooms/{id}` — delete a room by id.
 *
 * A delete's end state is the same however many times it runs — declared
 * idempotent.
 */
interface Input {
  roomId: string;
}

const roomsDelete: ActionDefinition<Input> = {
  key: "rooms-delete",
  type: "perform",
  resource: "room",
  title: "Delete Room",
  description: "Delete a room by id.",
  idempotent: true,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/rooms/${encodeId(input.roomId)}`, { method: "DELETE" });
  },
};

export default roomsDelete;
