import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
}

/** `GET /rooms/{room_id}/members` — every member of a chat, with their role. */
const roomMemberList: ActionDefinition<Input> = {
  key: "room-member-list",
  type: "read",
  resource: "member",
  title: "List Chat Members",
  description: "List every member of a chat, with their role.",
  params: [roomIdParam],
  output: [
    { key: "account_id", type: "number", label: "Account ID" },
    { key: "role", type: "string", label: "admin | member | readonly" },
    { key: "name", type: "string", label: "Display name" },
    { key: "chatwork_id", type: "string", label: "Chatwork ID" },
    { key: "organization_id", type: "number", label: "Organization ID" },
    { key: "organization_name", type: "string", label: "Organization name" },
    { key: "department", type: "string", label: "Department" },
    { key: "avatar_image_url", type: "string", label: "Avatar image URL" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}/members`);
  },
};

export default roomMemberList;
