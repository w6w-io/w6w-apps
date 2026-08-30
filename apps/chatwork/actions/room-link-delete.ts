import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
}

/**
 * `DELETE /rooms/{room_id}/link` — delete a chat's invite link.
 *
 * Unlike most `DELETE`s in this API, this answers `200` with an
 * `invitation_link` body (`public: false`), not `204`.
 */
const roomLinkDelete: ActionDefinition<Input> = {
  key: "room-link-delete",
  type: "perform",
  resource: "link",
  title: "Delete Invite Link",
  description: "Delete a chat's invite link.",
  idempotent: true,
  params: [roomIdParam],
  output: [{ key: "public", type: "boolean", label: "false — the link no longer exists" }],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/link`, {
      method: "DELETE",
    });
  },
};

export default roomLinkDelete;
