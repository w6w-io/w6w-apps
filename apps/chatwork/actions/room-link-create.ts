import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
  code?: string;
  needAcceptance?: boolean;
  description?: string;
}

/** `POST /rooms/{room_id}/link` — create a chat's invite link. A chat has at most one. */
const roomLinkCreate: ActionDefinition<Input> = {
  key: "room-link-create",
  type: "perform",
  resource: "link",
  title: "Create Invite Link",
  description: "Create a chat's invite link. Fails if one already exists — use Update instead.",
  idempotent: true,
  params: [
    roomIdParam,
    {
      key: "code",
      label: "Link code",
      type: "string",
      hint: "The path segment of the invite URL. Leave empty for a random string.",
    },
    {
      key: "needAcceptance",
      label: "Require admin approval to join",
      type: "boolean",
      default: true,
    },
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
      method: "POST",
      form: {
        code: input.code,
        need_acceptance: input.needAcceptance === false ? "0" : undefined,
        description: input.description,
      },
    });
  },
};

export default roomLinkCreate;
