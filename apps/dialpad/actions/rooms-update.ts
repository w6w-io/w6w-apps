import type { ActionDefinition } from "@w6w/types";
import { DialpadClient, encodeId } from "../lib/client.ts";
import { toStringArray } from "../lib/params.ts";

/**
 * `PATCH /api/v2/rooms/{id}` — update a room's name or reorder/unassign its
 * phone numbers.
 *
 * `phoneNumbers` replaces the full list — sending the same body twice ends in
 * the same state, declared idempotent.
 */
interface Input {
  roomId: string;
  name?: string;
  phoneNumbers?: string;
}

const roomsUpdate: ActionDefinition<Input> = {
  key: "rooms-update",
  type: "perform",
  resource: "room",
  title: "Update Room",
  description: "Update a room's name, or reorder/unassign its phone numbers.",
  idempotent: true,
  params: [
    { key: "roomId", label: "Room ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    {
      key: "phoneNumbers",
      label: "Phone numbers",
      type: "string",
      hint: "Comma-separated E164 numbers. Replaces the full list — remove one by leaving it out.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json(`/rooms/${encodeId(input.roomId)}`, {
      method: "PATCH",
      body: {
        name: input.name,
        phone_numbers: toStringArray(input.phoneNumbers),
      },
    });
  },
};

export default roomsUpdate;
