import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIconPresetOptions, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  name?: string;
  description?: string;
  iconPreset?: string;
}

/** `PUT /rooms/{room_id}` — update a chat's name, description and/or icon. */
const roomUpdate: ActionDefinition<Input> = {
  key: "room-update",
  type: "perform",
  resource: "room",
  title: "Update Chat",
  description: "Update a chat's name, description and/or icon. Requires the Administrator role.",
  idempotent: true,
  params: [
    roomIdParam,
    { key: "name", label: "Name", type: "string", validation: { maxLength: 255 } },
    { key: "description", label: "Description", type: "text" },
    { key: "iconPreset", label: "Icon", type: "select", options: roomIconPresetOptions },
  ],
  output: [{ key: "room_id", type: "number", label: "Updated room ID" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}`, {
      method: "PUT",
      form: { name: input.name, description: input.description, icon_preset: input.iconPreset },
    });
  },
};

export default roomUpdate;
