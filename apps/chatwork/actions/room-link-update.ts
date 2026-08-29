import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  code?: string;
  needAcceptance?: boolean;
  description?: string;
}

/** `PUT /rooms/{room_id}/link` — update a chat's existing invite link. */
const roomLinkUpdate: ActionDefinition<Input> = {
  key: "room-link-update",
  type: "perform",
  resource: "link",
  title: "Update Invite Link",
  description: "Update a chat's existing invite link.",
  idempotent: true,
  params: [
    roomIdParam,
    { key: "code", label: "Link code", type: "string" },
    { key: "needAcceptance", label: "Require admin approval to join", type: "boolean" },
    { key: "description", label: "Description", type: "text" },
  ],
  output: [
    { key: "public", type: "boolean", label: "Whether the link is public" },
    { key: "url", type: "string", label: "Invite link URL" },
    { key: "need_acceptance", type: "boolean", label: "Whether joining needs admin approval" },
    { key: "description", type: "string", label: "Description shown on the invite page" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/link`, {
      method: "PUT",
      form: {
        code: input.code,
        need_acceptance: input.needAcceptance === undefined
          ? undefined
          : (input.needAcceptance ? "1" : "0"),
        description: input.description,
      },
    });
  },
};

export default roomLinkUpdate;
