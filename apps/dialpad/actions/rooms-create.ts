import type { ActionDefinition } from "@w6w/types";
import { DialpadClient } from "../lib/client.ts";

/**
 * `POST /api/v2/rooms` — create a new room in an office.
 *
 * No idempotency key is documented, so calling this twice creates two rooms.
 */
interface Input {
  name: string;
  officeId: string;
}

const roomsCreate: ActionDefinition<Input> = {
  key: "rooms-create",
  type: "perform",
  resource: "room",
  title: "Create Room",
  description: "Create a new room.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "officeId",
      label: "Office ID",
      type: "string",
      required: true,
      hint: "Look one up with the List Offices action.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Room ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    return new DialpadClient(ctx).json("/rooms", {
      method: "POST",
      body: { name: input.name, office_id: Number(input.officeId) },
    });
  },
};

export default roomsCreate;
