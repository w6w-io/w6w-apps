import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
}

/**
 * `GET /rooms/{room_id}/link` — a chat's invite link, if one exists.
 * `public: false` (with no `url`) means no link has been created.
 */
const roomLinkGet: ActionDefinition<Input> = {
  key: "room-link-get",
  type: "read",
  resource: "link",
  title: "Get Invite Link",
  description: "Fetch a chat's invite link, if one exists.",
  params: [roomIdParam],
  output: [
    { key: "public", type: "boolean", label: "Whether an invite link exists and is public" },
    { key: "url", type: "string", label: "Invite link URL" },
    { key: "need_acceptance", type: "boolean", label: "Whether joining needs admin approval" },
    { key: "description", type: "string", label: "Description shown on the invite page" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/link`);
  },
};

export default roomLinkGet;
