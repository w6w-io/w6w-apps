import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomActionTypeOptions, roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  actionType: "leave" | "delete";
}

/**
 * `DELETE /rooms/{room_id}` — leave a chat, or permanently delete it.
 *
 * Answers `204 No Content` with no body on success. `action_type: "delete"`
 * requires the Administrator role and cannot be undone.
 */
const roomDelete: ActionDefinition<Input> = {
  key: "room-delete",
  type: "perform",
  resource: "room",
  title: "Leave or Delete Chat",
  description: "Leave a group chat, or permanently delete it (Administrator role required).",
  idempotent: true,
  params: [
    roomIdParam,
    {
      key: "actionType",
      label: "Action",
      type: "select",
      required: true,
      options: roomActionTypeOptions,
    },
  ],
  output: [],

  async execute(input, ctx) {
    await new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}`, {
      method: "DELETE",
      form: { action_type: input.actionType },
    });
    return {};
  },
};

export default roomDelete;
