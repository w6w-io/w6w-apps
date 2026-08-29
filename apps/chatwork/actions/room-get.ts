import type { ActionDefinition } from "@w6w/types";
import { ChatworkClient } from "../lib/client.ts";
import { roomIdParam } from "../lib/params.ts";

interface Input {
  roomId: string;
}

/** `GET /rooms/{room_id}` — one chat's info, including its description. */
const roomGet: ActionDefinition<Input> = {
  key: "room-get",
  type: "read",
  resource: "room",
  title: "Get Chat",
  description: "Fetch one chat's info, including its description.",
  params: [roomIdParam],
  output: [
    { key: "room_id", type: "number", label: "Room ID" },
    { key: "name", type: "string", label: "Chat name" },
    { key: "type", type: "string", label: "my | direct | group" },
    { key: "role", type: "string", label: "My role: admin | member | readonly" },
    { key: "sticky", type: "boolean", label: "Pinned" },
    { key: "description", type: "string", label: "Description" },
    { key: "unread_num", type: "number", label: "Unread messages" },
    { key: "mention_num", type: "number", label: "Unread mentions of me" },
    { key: "mytask_num", type: "number", label: "My open tasks" },
    { key: "message_num", type: "number", label: "Total messages" },
    { key: "file_num", type: "number", label: "Total files" },
    { key: "task_num", type: "number", label: "Total tasks" },
    { key: "icon_path", type: "string", label: "Chat icon URL" },
    { key: "last_update_time", type: "number", label: "Last update (Unix seconds)" },
  ],

  execute(input, ctx) {
    return new ChatworkClient(ctx).json(`/rooms/${encodeURIComponent(input.roomId)}`);
  },
};

export default roomGet;
